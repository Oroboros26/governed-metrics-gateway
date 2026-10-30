from fastapi import APIRouter, Request

from app.core.graph import graph_manager
from app.core.validator import CompileError, SemanticASTCompiler

mcp_router = APIRouter(prefix="/mcp")
PREFIX = "get_metric_"


def _error(text: str) -> dict:
    return {"content": [{"type": "text", "text": text}], "isError": True}


@mcp_router.get("/tools")
async def list_tools():
    """Exposes approved semantic definitions to the AI agent as callable tools."""
    return {"tools": [
        {
            "name": f"{PREFIX}{name}",
            "description": f"Fetches pre-vetted corporate data numbers for: {d.description or name}",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "format": "date"},
                    "end_date": {"type": "string", "format": "date"},
                    "time_filter_days": {"type": "integer", "minimum": 1, "description": "Limit to the last N days"},
                },
            },
        }
        for name, d in graph_manager.metrics_registry.items()
    ]}


@mcp_router.post("/tools/call")
async def call_tool(request: Request):
    """Compiles a vetted metric to warehouse SQL. Limitation: returns SQL, no execution until a warehouse driver exists."""
    try:
        payload = await request.json()
        tool_name, args = payload["name"], payload.get("arguments") or {}
    except (ValueError, KeyError, TypeError):
        return _error("Malformed request: expected JSON with 'name' and optional 'arguments'.")

    metric = graph_manager.metrics_registry.get(tool_name.removeprefix(PREFIX)) if tool_name.startswith(PREFIX) else None
    if metric is None:
        return _error(f"Metric tool '{tool_name}' is unregistered.")

    try:
        sql = SemanticASTCompiler.compile_metric(
            metric, graph_manager.active_dialect,
            time_filter_days=args.get("time_filter_days"),
            start_date=args.get("start_date"), end_date=args.get("end_date"),
        )
    except CompileError as e:
        return _error(f"{e.category}: {e.message}")
    return {
        "content": [{"type": "text", "text": f"Target Dialect: {graph_manager.active_dialect}\nCompiled SQL:\n{sql}"}],
        "isError": False,
    }
