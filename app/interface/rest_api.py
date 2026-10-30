import asyncio
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from app.core import proposals
from app.core.auth import COOKIE, USERS, current_user, make_token
from app.core.graph import SemanticGraphManager, graph_manager
from app.core.simulator import WAREHOUSE, check_formula, simulate
from app.core.validator import CompileError, SemanticASTCompiler
from app.schemas.metrics import MetricDefinition, SemanticLayerConfig

rest_router = APIRouter(prefix="/api")


def _get(name: str):
    m = graph_manager.metrics_registry.get(name)
    if m is None:
        raise HTTPException(404, f"Unknown metric '{name}'")
    return m


# ---- session & heartbeat ----
@rest_router.get("/users")
async def users():
    return [{"id": k, "name": v["name"], "title": v["title"]} for k, v in USERS.items()]


@rest_router.post("/login")
async def login(body: dict, response: Response):
    uid = body.get("user")
    if uid not in USERS:
        raise HTTPException(400, "Unknown user")
    response.set_cookie(COOKIE, make_token(uid), httponly=True, samesite="lax")
    return {"ok": True}


@rest_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE)
    return {"ok": True}


@rest_router.get("/session")
async def session(user: dict = Depends(current_user)):
    return user


@rest_router.get("/status")
async def status():
    # Limitation: reports the proxy and the demo warehouse honestly; no Snowflake driver is wired in.
    return {"connected": True, "warehouse": "DEMO", "engine": "in-memory SQLite", "revision": graph_manager.revision}


@rest_router.get("/warehouse")
async def warehouse(user: dict = Depends(current_user)):
    return WAREHOUSE


# ---- catalog (scoped to the signed-in user) ----
def _sql(m: MetricDefinition) -> Optional[str]:
    try:
        return SemanticASTCompiler.compile_metric(m, graph_manager.active_dialect)
    except CompileError:
        return None


@rest_router.get("/metrics")
async def list_metrics(user: dict = Depends(current_user)):
    return {
        "dialect": graph_manager.active_dialect,
        "metrics": [{**m.model_dump(), "sql": _sql(m)} for m in graph_manager.metrics_registry.values() if m.domain in user["domains"]],
    }


@rest_router.get("/metrics/{name}")
async def get_metric(name: str):
    return _get(name)


@rest_router.get("/metrics/{name}/sql")
async def compile_sql(name: str, time_filter_days: Optional[int] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    try:
        sql = SemanticASTCompiler.compile_metric(_get(name), graph_manager.active_dialect, time_filter_days, start_date, end_date)
    except CompileError as e:
        raise HTTPException(422, e.to_dict())
    return {"metric": name, "dialect": graph_manager.active_dialect, "sql": sql}


@rest_router.get("/metrics/{name}/impact")
@rest_router.get("/v1/metrics/impact/{name}")
async def impact(name: str):
    # Limitation: only downstream metrics are tracked; no registry exists for AI-tool configs or BI dashboards.
    _get(name)
    return {"metric": name, "downstream": graph_manager.get_downstream_impact(name)}


# ---- change proposals: create / update / delete -> validate -> 7-day test -> review -> live ----
class ProposalRequest(BaseModel):
    action: Literal["create", "update", "delete"]
    metric: MetricDefinition


class SubmitRequest(ProposalRequest):
    justification: str = Field(min_length=1, max_length=2000)


class Decision(BaseModel):
    decision: Literal["approve", "reject"]
    note: str = Field("", max_length=2000)


def _prepare(user: dict, req: ProposalRequest):
    """Shared server-side gate. Returns (new_metric_or_None, existing_or_None)."""
    m, existing = req.metric, graph_manager.metrics_registry.get(req.metric.name)
    if req.action == "create" and existing:
        raise HTTPException(409, f"A metric named '{m.name}' already exists.")
    if req.action != "create" and not existing:
        raise HTTPException(404, f"Unknown metric '{m.name}'")
    if m.domain not in user["domains"] or (existing and existing.domain not in user["domains"]):
        raise HTTPException(403, f"{user['name']}'s workspace scope cannot change '{m.name}'.")
    if req.action == "delete":
        down = graph_manager.get_downstream_impact(m.name)
        if down:
            raise HTTPException(409, {"message": f"Cannot delete '{m.name}': {', '.join(down)} depend on it. Update those metrics first.", "dependents": down})
        return None, existing
    try:
        trial = SemanticGraphManager()
        trial.load_configuration(SemanticLayerConfig(version="trial", dialect=graph_manager.active_dialect, metrics={**graph_manager.metrics_registry, m.name: m}))
        check_formula(m, graph_manager.active_dialect)
    except ValueError as e:
        raise HTTPException(422, {"message": str(e).removeprefix("Compilation Error: ")})
    except CompileError as e:
        raise HTTPException(422, e.to_dict())
    return m, existing


def _visible(user: dict, doc: dict) -> bool:
    return user["can_review"] or doc["metric"].get("domain", "ecommerce") in user["domains"]


@rest_router.post("/drafts/validate")
async def validate_draft(req: ProposalRequest, user: dict = Depends(current_user)):
    _prepare(user, req)
    return {"ok": True}


@rest_router.post("/drafts/simulate")
async def simulate_draft(req: ProposalRequest, user: dict = Depends(current_user)):
    new, existing = _prepare(user, req)
    if new is None:
        raise HTTPException(422, {"message": "Nothing to simulate for a delete."})
    try:
        return await simulate(existing, new, graph_manager.active_dialect)
    except CompileError as e:
        raise HTTPException(422, e.to_dict())


@rest_router.get("/proposals")
async def list_proposals(user: dict = Depends(current_user)):
    docs = await asyncio.to_thread(proposals.read_all)
    return [d for d in docs if _visible(user, d)]


@rest_router.post("/proposals")
async def submit(req: SubmitRequest, user: dict = Depends(current_user)):
    new, existing = _prepare(user, req)
    docs = await asyncio.to_thread(proposals.read_all)
    if any(d["metric"]["name"] == req.metric.name and d["proposal"]["status"] == "pending_review" for d in docs):
        raise HTTPException(409, f"'{req.metric.name}' already has a change pending review.")
    if new is not None:  # the 7-day dry run is the automated gate
        try:
            await simulate(existing, new, graph_manager.active_dialect)
        except CompileError as e:
            raise HTTPException(422, e.to_dict())
    now = datetime.now(timezone.utc)
    at = now.isoformat()
    # Limitation: Draft Canvas time = submit time (drafts live in the browser, so the server can't know earlier)
    doc = {
        "proposal": {
            "id": f"{req.metric.name}__{now:%Y%m%dT%H%M%S%f}", "action": req.action, "status": "pending_review",
            "submitted_by": user["id"], "role": user["role"], "justification": req.justification.strip(),
            "stages": [{"stage": s, "at": at} for s in ("draft_canvas", "compilation_passed", "pending_review")],
        },
        "metric": (new or existing).model_dump(exclude_none=True),
    }
    await asyncio.to_thread(proposals.write, doc)
    return {"id": doc["proposal"]["id"], "status": "pending_review"}


@rest_router.post("/proposals/{pid}/decision")
async def decide(pid: str, body: Decision, user: dict = Depends(current_user)):
    if not user["can_review"]:
        raise HTTPException(403, "Only the Data Platform team can review changes.")
    doc = next((d for d in await asyncio.to_thread(proposals.read_all) if d["proposal"]["id"] == pid), None)
    if doc is None:
        raise HTTPException(404, "Unknown proposal")
    p = doc["proposal"]
    if p["status"] != "pending_review":
        raise HTTPException(409, f"Proposal is already {p['status']}.")
    if body.decision == "approve":
        try:  # validates lineage/cycles before the swap; a bad merge leaves production untouched
            metrics = proposals.apply(dict(graph_manager.metrics_registry), doc)
            graph_manager.load_configuration(SemanticLayerConfig(version="runtime", dialect=graph_manager.active_dialect, metrics=metrics))
        except ValueError as e:
            raise HTTPException(422, {"message": str(e).removeprefix("Compilation Error: ")})
    p["status"] = "live" if body.decision == "approve" else "rejected"
    p["reviewed_by"], p["review_note"] = user["id"], body.note.strip()
    p["stages"].append({"stage": "live" if body.decision == "approve" else "rejected", "at": datetime.now(timezone.utc).isoformat()})
    await asyncio.to_thread(proposals.write, doc)
    return {"id": pid, "status": p["status"]}
