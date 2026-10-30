
Semantix MVP Engineering Specification & System Prompt


1. Objective & Scope

You are building the foundational core of Semantix, an Enterprise Semantic Gateway. The goal of this MVP is to build a stateless local proxy server that takes text-based metric definitions (YAML files), runs them through an automated compiler and safety validation pipeline, and exposes those metrics safely to AI agents via the Model Context Protocol (MCP) and to downstream systems via a clean REST API.
This MVP runs completely locally in a Python environment. Do not build billing, cloud multi-tenancy, or external repository webhooks yet. Focus on raw compile, test, and proxy execution speed.

Core Architecture Components

[ Input: metrics.yaml ] ──► Ingested by FastAPI Core
                                │
[ Validation Layer ]   ──► NetworkX verifies DAG dependencies & avoids loops
                                │
[ Compiler Layer ]     ──► Sqlglot parses to AST -> Transpiles to target dialect
                                │
[ Warehouse Safety ]   ──► Runs dynamic EXPLAIN/Sampling against target warehouse
                                │
┌──────────────────────────────┴──────────────────────────────┐
▼                                                             ▼
[ Interface A: MCP Server Gateway ]           [ Interface B: REST Client API ]
- Exposes metrics as deterministic tools      - Exposes data via standard endpoints

2. Technical Stack & Target Dependencies

The application must be written strictly in Python 3.11+ utilizing fully asynchronous (async/await) execution pathways. You must use the following open-source dependencies exclusively:
• fastapi & uvicorn (Core web framework and ASGI server ecosystem)
• pydantic >= 2.0 (Strict runtime type verification and config schema checks)
• sqlglot (Abstract Syntax Tree parsing, mutation, and warehouse dialect transpilation)
• networkx (In-memory dependency lineage processing and circular loop discovery)
• pytest & pytest-asyncio (Automated backend unit validation)

3. Implementation Blueprint & Module Specification


Component A: The Schema & Configuration Engine (app/schemas/metrics.py)

Define the rigid template architecture that maps out how business metrics are documented as code using Pydantic.
python
from typing import List, Optional
from pydantic import BaseModel, Field

class MetricDefinition(BaseModel):
    name: str = Field(..., description="Unique alphanumeric identifier (snake_case)")
    base_table: str = Field(..., description="The underlying physical warehouse table or dbt model")
    expression: str = Field(..., description="Excel-like mathematical string expression (e.g., SUM(a) / SUM(b))")
    description: Optional[str] = None
    dependencies: List[str] = Field(default_factory=list, description="Upstream semantic metric names this calculation relies on")
Use code with caution.

Component B: In-Memory Graph Reconciliation (app/core/graph.py)

Utilize NetworkX to evaluate code safety before any configuration file is mounted into the active runtime stream.
• Requirements: Build a SemanticGraph service manager. When configurations change, load all definitions into a Directed Acyclic Graph (DAG).
• Validation Check: If a metric contains a dependency node array, map edges from those parameters to the baseline target. Execute a cyclical verification check (networkx.is_directed_acyclic_graph). If a user introduces a loop, freeze ingestion and throw a clear compilation runtime exception.

Component C: Multi-Dialect AST Compiler Engine (app/compilers/sql_compiler.py)

Build the abstract parsing framework using Sqlglot. Do not perform raw string concats.
• Requirements: Take a visual expression statement block. Parse the input string into a standard Sqlglot expression tree node.
• Divide-by-Zero Protection Rule: Construct a transformer method that sweeps the AST. If a division operator / is detected, programmatically wrap the target denominator expression inside a database-agnostic NULLIF(denominator, 0) schema array (or target dialect native equivalent like BigQuery's SAFE_DIVIDE) before compiling to the final warehouse dialect footprint (e.g., Snowflake, BigQuery).

Component D: Warehouse Safety & Sampling Controls (app/core/validator.py)

Protect the underlying warehouse infrastructure from unoptimized testing operations.
• Requirements: Build an execution proxy framework. When running local user previews, mutate the compiled SQL string array to inject hard-coded sampling guardrails.
• The Cost Filter: Inject a native table sampling clause (e.g., TABLESAMPLE (1 PERCENT)) or push a dynamic 7-day retrospective clause (WHERE operational_date >= CURRENT_DATE - 7) into the query plan. Run an asynchronous EXPLAIN <query> statement first, parse the predicted database engine byte costs, and kill query jobs that exceed target safety thresholds.

Component E: The Model Context Protocol Gateway (app/interface/mcp.py)

Build a standard Model Context Protocol (MCP) server over SSE (Server-Sent Events) or HTTP endpoints directly inside the FastAPI environment.
• Requirements: Implement two explicit protocol tools:
	1. list_tools: Exposes all approved semantic definitions loaded inside the active graph container as functional metadata declarations.
	2. call_tool: Accepts clear JSON key inputs (metric_name, start_date, end_date), automatically injects those parameters into the secure, pre-vetted SQL compiler logic, fires the task against the data platform asynchronously, and streams structural data blocks straight back to the requesting AI Agent.

4. Coding Agent Instructions & Prompt Routine

When executing this layout, follow these programming instructions explicitly:
1. Asynchronous Architecture Throughout: Ensure all file reading, warehouse communication, network interface pipelines, and tool calls are natively built using asynchronous operations. Never block the primary thread loop.
2. Defensive Exception Trapping: Wrap all SQL transpilation steps and data warehouse connections in granular try/except arrays. Never bubble unhandled stack traces up to client terminals. If a database query fails, trap it, categorize it (e.g., SyntaxError, PermissionError, TimeoutError), and expose structured metadata diagnostic payloads.
3. Decoupled Business and Platform Isolation: Enforce absolute data isolation. Ensure that the core computational engines (graph.py, sql_compiler.py) are completely blind to individual database credentials—they must operate entirely on logical schemas and config properties.




1. System Architecture & Directory Blueprint

You are building the local, stateless Data Plane Core of Semantix. The code must be highly modular, asynchronous, and strictly organized according to the following layout. Generate every file listed below.
text
semantix-data-plane/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI Application Initialization
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── metrics.py          # Rigid Pydantic v2 configuration structures
│   ├── core/
│   │   ├── __init__.py
│   │   ├── graph.py            # NetworkX DAG compilation & reconciliation loops
│   │   └── validator.py        # Sqlglot AST parser & cost guardrails
│   └── interface/
│       ├── __init__.py
│       ├── rest_api.py         # Standard business and BI consumer routes
│       └── mcp.py              # Strict Model Context Protocol Server (SSE/HTTP)
├── tests/
│   ├── __init__.py
│   └── test_engine.py          # Pytest suite for compiler and validation checks
├── requirements.txt            # Explicit dependency pinning
└── test_metrics.yaml           # Local mock semantic layer configuration file
Use code with caution.

2. Pinpoint Dependency Specification (requirements.txt)

Ensure the environment uses exactly these versions. Write this file out first:
text
fastapi>=0.110.0
uvicorn>=0.30.0
pydantic>=2.6.0
sqlglot>=23.0.0
networkx>=3.2.0
pyyaml>=6.0.1
pytest>=8.0.0
pytest-asyncio>=0.23.0
Use code with caution.

3. Reference Implementation Blocks (Enforced Programming Specifications)

You must implement the internal modules exactly as specified below. Do not use stubs or mock return structures.

A. The Declarative Config Engine (app/schemas/metrics.py)

python
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class MetricDefinition(BaseModel):
    name: str = Field(..., description="Unique snake_case identifier")
    base_table: str = Field(..., description="The underlying physical database table name")
    expression: str = Field(..., description="Mathematical expression (e.g., SUM(sales) / SUM(orders))")
    dependencies: List[str] = Field(default_factory=list, description="Other semantic metrics this relies on")
    description: Optional[str] = None

class SemanticLayerConfig(BaseModel):
    version: str
    dialect: str = Field("snowflake", description="Target warehouse: snowflake, bigquery, or databricks")
    metrics: Dict[str, MetricDefinition]
Use code with caution.

B. In-Memory Graph Reconciliation (app/core/graph.py)

python
import networkx as nx
from app.schemas.metrics import SemanticLayerConfig, MetricDefinition

class SemanticGraphManager:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.metrics_registry: Dict[str, MetricDefinition] = {}
        self.active_dialect = "snowflake"

    def load_configuration(self, config: SemanticLayerConfig):
        temp_graph = nx.DiGraph()
        
        # Phase 1: Register all nodes first
        for metric_name, definition in config.metrics.items():
            temp_graph.add_node(metric_name, definition=definition)
            
        # Phase 2: Establish dependency edges
        for metric_name, definition in config.metrics.items():
            for dep in definition.dependencies:
                if dep not in config.metrics:
                    raise ValueError(f"Compilation Error: Broken Lineage. Metric '{metric_name}' depends on non-existent metric '{dep}'.")
                temp_graph.add_edge(dep, metric_name) # Edge directional flow: upstream -> downstream
                
        # Phase 3: Cyclical Integrity Audits
        if not nx.is_directed_acyclic_graph(temp_graph):
            cycles = list(nx.simple_cycles(temp_graph))
            raise ValueError(f"Compilation Error: Circular Loop Detected inside semantic view definition: {cycles}")
            
        # Commit to live operational memory state if validated
        self.graph = temp_graph
        self.metrics_registry = config.metrics
        self.active_dialect = config.dialect

    def get_downstream_impact(self, metric_name: str) -> List[str]:
        if metric_name not in self.graph:
            return []
        return list(nx.descendants(self.graph, metric_name))
Use code with caution.

C. Multi-Dialect AST Compiler Engine (app/core/validator.py)

python
import sqlglot
from sqlglot import exp, parse_one, transpile
from app.schemas.metrics import MetricDefinition

class SemanticASTCompiler:
    @staticmethod
    def inject_divide_by_zero_protection(expression_str: str, dialect: str) -> str:
        """Parses expression to AST, rewrites any division operator to protect infrastructure."""
        ast = parse_one(expression_str, read=dialect)
        
        # Walk the AST and modify division operations programmatically
        def transform_nodes(node):
            if isinstance(node, exp.Div):
                # Mutate denominator to wrap inside a NULLIF expression block
                original_denominator = node.this if hasattr(node, "this") else node.expression
                nullif_node = exp.Nullif(this=original_denominator, expression=exp.Literal.number(0))
                node.set("this", nullif_node)
            return node

        modified_ast = ast.transform(transform_nodes)
        return modified_ast.sql(dialect=dialect)

    @classmethod
    def compile_metric(cls, metric: MetricDefinition, dialect: str, time_filter_days: Optional[int] = None) -> str:
        safe_expr = cls.inject_divide_by_zero_protection(metric.expression, dialect)
        
        # Build base abstraction query payload
        query = f"SELECT {safe_expr} AS {metric.name} FROM {metric.base_table}"
        ast_query = parse_one(query, read=dialect)
        
        # Apply strict query optimization sampling bounds if runtime testing filters are declared
        if time_filter_days:
            # Inject dynamic lookback constraints programmatically into the statement AST
            where_clause = parse_one(f"WHERE created_at >= CURRENT_DATE - INTERVAL '{time_filter_days}' DAY", read=dialect)
            ast_query = ast_query.where(where_clause.args.get("this"), append=True)
            
        return ast_query.sql(dialect=dialect)
Use code with caution.

D. The Model Context Protocol (MCP) Implementation (app/interface/mcp.py)

Implement a fully native MCP server using Server-Sent Events (SSE) layout models to interact cleanly with frontier AI architectures.
python
import json
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from app.core.graph import SemanticGraphManager
from app.core.validator import SemanticASTCompiler

mcp_router = APIRouter(prefix="/mcp")
graph_manager = SemanticGraphManager() # Global instance reference initialized during server startup

@mcp_router.get("/tools")
async def list_tools():
    """Exposes approved semantic layer definitions to the AI agent as callable tools."""
    tools = []
    for name, definition in graph_manager.metrics_registry.items():
        tools.append({
            "name": f"get_metric_{name}",
            "description": f"Fetches pre-vetted corporate data numbers for: {definition.description or name}",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "time_filter_days": {"type": "integer", "description": "Limit calculations to a historical day window boundary"}
                }
            }
        })
    return {"tools": tools}

@mcp_router.post("/tools/call")
async def call_tool(request: Request):
    """Intercepts deterministic tool calls from AI agents, compiling and preparing proxy outputs."""
    payload = await request.json()
    tool_name = payload.get("name", "")
    arguments = payload.get("arguments", {})
    
    metric_name = tool_name.replace("get_metric_", "")
    if metric_name not in graph_manager.metrics_registry:
        return {"content": [{"type": "text", "text": f"Error: Metric tool '{tool_name}' is unregistered."}], "isError": True}
        
    metric_def = graph_manager.metrics_registry[metric_name]
    time_filter = arguments.get("time_filter_days", None)
    
    try:
        # Compile secure, transiled warehouse statement string
        compiled_sql = SemanticASTCompiler.compile_metric(
            metric=metric_def, 
            dialect=graph_manager.active_dialect,
            time_filter_days=time_filter
        )
        
        # Return the pre-vetted compiled statement directly back inside the safe tool response channel
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"Execution Strategy Generated Successfully.\nTarget Dialect: {graph_manager.active_dialect}\nCompiled SQL Clause:\n{compiled_sql}"
                }
            ],
            "isError": False
        }
    except Exception as e:
        return {"content": [{"type": "text", "text": f"Compilation Exception Trapped: {str(e)}"}], "isError": True}
Use code with caution.

4. Test Configuration File Data Layer (test_metrics.yaml)

Write this sample data layer out to the root directory so the agent can execute automated graph tests immediately.
yaml
version: "1.0.0"
dialect: "snowflake"
metrics:
  gross_revenue:
    name: "gross_revenue"
    base_table: "fct_orders"
    expression: "SUM(item_price * quantity)"
    description: "Total revenue generated before tax and discounts calculation runs"
  net_return_rate:
    name: "net_return_rate"
    base_table: "fct_orders"
    expression: "SUM(returned_items_count) / SUM(total_items_ordered)"
    dependencies: ["gross_revenue"]
    description: "The structural digital product return ratio"
Use code with caution.

5. Execution Directives for the Coding Agent

1. Zero Placeholders Rule: You are explicitly forbidden from leaving code modules empty, using pass markers, or dropping comment blocks like # To be implemented later. Implement full, clean string parsing loops, input checks, and error logging across all files.
2. Defensive Edge Case Trapping: You must wrap all parser activities with structured try-except handlers. If bad logic is passed to Sqlglot, trap the syntax variance gracefully, extract the failing index location metadata, and pass a clear payload up to the endpoints.
3. Synchronous Server Entry point: Build out app/main.py to automatically ingest test_metrics.yaml on lifecycle launch (@app.on_event("startup")), verifying and seeding the graph state before the local port begins listening for traffic.
