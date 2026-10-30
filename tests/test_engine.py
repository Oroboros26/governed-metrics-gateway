import pytest
from fastapi.testclient import TestClient

from app.core.graph import SemanticGraphManager
from app.core.validator import CompileError, SemanticASTCompiler, check_cost
from app.main import app
from app.schemas.metrics import MetricDefinition, SemanticLayerConfig


def m(name, expr="SUM(a)", deps=()):
    return MetricDefinition(name=name, base_table="t", expression=expr, dependencies=list(deps))


def cfg(*metrics):
    return SemanticLayerConfig(version="1", metrics={x.name: x for x in metrics})


def test_div_wraps_denominator():
    sql = SemanticASTCompiler.compile_metric(m("r", "SUM(a) / SUM(b)"), "snowflake")
    assert sql == "SELECT SUM(a) / NULLIF(SUM(b), 0) AS r FROM t"


def test_nested_div():
    sql = SemanticASTCompiler.compile_metric(m("r", "a / (b / c)"), "bigquery")
    assert "NULLIF((b / NULLIF(c, 0)), 0)" in sql


def test_filters():
    sql = SemanticASTCompiler.compile_metric(m("r"), "snowflake", 7, "2024-01-01", "2024-02-01")
    assert "created_at >= CURRENT_DATE - INTERVAL" in sql
    assert "'2024-01-01'" in sql and "'2024-02-01'" in sql


def test_bad_input_is_structured():
    with pytest.raises(CompileError) as e:
        SemanticASTCompiler.compile_metric(m("r", "SUM(a"), "snowflake")
    assert e.value.category == "SyntaxError"
    with pytest.raises(CompileError):
        SemanticASTCompiler.compile_metric(m("r"), "snowflake", start_date="2024-13-45")


def test_graph_cycle_and_broken_lineage_keep_live_state():
    g = SemanticGraphManager()
    g.load_configuration(cfg(m("a"), m("b", deps=["a"])))
    assert g.get_downstream_impact("a") == ["b"]
    with pytest.raises(ValueError, match="Circular"):
        g.load_configuration(cfg(m("a", deps=["b"]), m("b", deps=["a"])))
    with pytest.raises(ValueError, match="Broken Lineage"):
        g.load_configuration(cfg(m("a", deps=["zzz"])))
    assert set(g.metrics_registry) == {"a", "b"}


@pytest.mark.asyncio
async def test_cost_guard():
    async def cheap(sql): return 10
    async def pricey(sql): return 10**12
    async def denied(sql): raise PermissionError("no")
    assert await check_cost("SELECT 1", cheap, 100) == 10
    for fn, cat in ((pricey, "CostExceeded"), (denied, "PermissionError")):
        with pytest.raises(CompileError) as e:
            await check_cost("SELECT 1", fn, 100)
        assert e.value.category == cat


def test_http_end_to_end():
    with TestClient(app) as c:  # runs lifespan -> loads test_metrics.yaml
        names = [t["name"] for t in c.get("/mcp/tools").json()["tools"]]
        assert names == ["get_metric_gross_revenue", "get_metric_net_return_rate", "get_metric_adjusted_operating_margin"]
        r = c.post("/mcp/tools/call", json={"name": "get_metric_net_return_rate", "arguments": {"time_filter_days": 7}}).json()
        assert not r["isError"] and "NULLIF" in r["content"][0]["text"]
        assert c.post("/mcp/tools/call", json={"name": "nope"}).json()["isError"]
        assert c.get("/api/metrics/gross_revenue/impact").json()["downstream"] == ["net_return_rate"]
        assert c.get("/api/metrics/x").status_code == 404


# ---- workspace: session, CRUD proposals, review lifecycle ----
@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("SEMANTIX_SUBMISSIONS", str(tmp_path))
    with TestClient(app) as c:
        yield c


def as_(c, user):
    c.cookies.clear()
    assert c.post("/api/login", json={"user": user}).status_code == 200


def metric(name="refund_rate", expression="SUM(returned_items_count) / SUM(quantity)", **kw):
    return {"name": name, "base_table": "fct_orders", "expression": expression, "domain": "ecommerce", **kw}


def req(action="create", **kw):
    return {"action": action, "metric": metric(**kw)}


def test_session_required_and_forged_cookie_rejected(client):
    assert client.get("/api/session").status_code == 401
    client.cookies.set("semantix_session", "jean.deadbeef")
    assert client.get("/api/metrics").status_code == 401
    as_(client, "jean")
    me = client.get("/api/session").json()
    assert me["sf_role"] == "ROLE_ECOM_ANALYST" and me["title"] == "E-com Lead"


def test_scope_filters_catalog_and_blocks_writes(client):
    as_(client, "jean")
    assert "adjusted_operating_margin" not in [m["name"] for m in client.get("/api/metrics").json()["metrics"]]
    finance = req("update", name="adjusted_operating_margin", base_table="finance_ledger", expression="SUM(revenue)", domain="finance")
    assert client.post("/api/drafts/validate", json=finance).status_code == 403
    as_(client, "amelie")
    assert "adjusted_operating_margin" in [m["name"] for m in client.get("/api/metrics").json()["metrics"]]


@pytest.mark.parametrize("expr,needle", [
    ("SUM(nope) / SUM(quantity)", "doesn't exist"),
    ("SUM(quantity", "SyntaxError"),
    ("(SELECT MAX(revenue) FROM finance_ledger)", "not queries"),
])
def test_bad_formulas_give_friendly_errors(client, expr, needle):
    as_(client, "jean")
    r = client.post("/api/drafts/validate", json=req(expression=expr))
    assert r.status_code == 422 and needle in str(r.json()["detail"])


def test_create_update_delete_lifecycle(client):
    as_(client, "jean")
    sim = client.post("/api/drafts/simulate", json=req()).json()
    assert len(sim["days"]) == 7 and sim["total"]["variance_pct"] is None  # new metric: no production side
    body = {**req(), "justification": "Track refunds"}
    assert client.post("/api/proposals", json={**body, "justification": ""}).status_code == 422
    assert client.post("/api/proposals", json=body).json()["status"] == "pending_review"
    assert client.post("/api/proposals", json=body).status_code == 409
    assert client.get("/api/metrics/refund_rate").status_code == 404  # not live until approved
    assert client.post("/api/proposals/x/decision", json={"decision": "approve"}).status_code == 403  # jean can't review
    pid = client.get("/api/proposals").json()[0]["proposal"]["id"]

    as_(client, "marc")
    assert client.post(f"/api/proposals/{pid}/decision", json={"decision": "approve"}).json()["status"] == "live"
    assert "refund_rate" in [m["name"] for m in client.get("/api/metrics").json()["metrics"]]
    assert client.get("/api/status").json()["revision"] > 1

    as_(client, "jean")  # update through review changes production only after approval
    upd = {**req("update", expression="SUM(returned_items_count) / SUM(total_items_ordered)"), "justification": "Use ordered items"}
    pid2 = client.post("/api/proposals", json=upd).json()["id"]
    assert "total_items_ordered" not in client.get("/api/metrics/refund_rate").json()["expression"]
    as_(client, "marc")
    client.post(f"/api/proposals/{pid2}/decision", json={"decision": "approve"})
    assert "total_items_ordered" in client.get("/api/metrics/refund_rate").json()["expression"]

    as_(client, "jean")
    pid3 = client.post("/api/proposals", json={**req("delete"), "justification": "Obsolete"}).json()["id"]
    as_(client, "marc")
    assert client.post(f"/api/proposals/{pid3}/decision", json={"decision": "reject", "note": "still used"}).json()["status"] == "rejected"
    assert client.get("/api/metrics/refund_rate").status_code == 200
    assert client.post(f"/api/proposals/{pid3}/decision", json={"decision": "approve"}).status_code == 409  # already decided


def test_delete_blocked_by_downstream_and_replay_on_restart(client, tmp_path):
    as_(client, "jean")
    gross = {"action": "delete", "metric": client.get("/api/metrics/gross_revenue").json()}
    r = client.post("/api/proposals", json={**gross, "justification": "x"})
    assert r.status_code == 409 and r.json()["detail"]["dependents"] == ["net_return_rate"]
    assert client.get("/api/v1/metrics/impact/gross_revenue").json()["downstream"] == ["net_return_rate"]
    # approved proposals survive a restart (replayed over the baseline)
    pid = client.post("/api/proposals", json={**req(), "justification": "Track refunds"}).json()["id"]
    as_(client, "marc")
    client.post(f"/api/proposals/{pid}/decision", json={"decision": "approve"})
    with TestClient(app) as fresh:
        assert fresh.get("/api/metrics/refund_rate").status_code == 200


def test_approve_that_would_break_lineage_is_refused(client):
    as_(client, "jean")
    dep = metric(name="uses_gross", dependencies=["gross_revenue"])
    pid = client.post("/api/proposals", json={"action": "create", "metric": dep, "justification": "x"}).json()["id"]
    as_(client, "marc")
    # gross_revenue disappears underneath the pending change: approval must fail and leave production alone
    from app.core.graph import graph_manager
    reg = dict(graph_manager.metrics_registry)
    reg.pop("net_return_rate"); reg.pop("gross_revenue")
    graph_manager.metrics_registry = reg
    r = client.post(f"/api/proposals/{pid}/decision", json={"decision": "approve"})
    assert r.status_code == 422 and "Broken Lineage" in r.json()["detail"]["message"]
