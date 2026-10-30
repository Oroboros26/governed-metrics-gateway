import asyncio
import random
import sqlite3
from datetime import date, timedelta
from typing import Optional

import sqlglot
from sqlglot import exp
from sqlglot.errors import SqlglotError

from app.core.validator import CompileError, SemanticASTCompiler
from app.schemas.metrics import MetricDefinition

# Demo warehouse catalog: table -> column names. The 7-day test runs against a seeded in-memory copy.
WAREHOUSE = {
    "fct_orders": ["order_id", "item_price", "quantity", "returned_items_count", "total_items_ordered", "created_at"],
    "finance_ledger": ["entry_id", "revenue", "operating_income", "one_off_costs", "created_at"],
}


def check_formula(m: MetricDefinition, dialect: str) -> str:
    """Friendly gate for business-authored formulas. Returns compiled SQL or raises CompileError."""
    if m.base_table not in WAREHOUSE:
        raise CompileError("ValidationError", f"Unknown source table '{m.base_table}'.")
    ast = SemanticASTCompiler.inject_divide_by_zero_protection(m.expression, dialect)
    if ast.find(exp.Select, exp.Subquery):
        raise CompileError("ValidationError", "Formulas can only combine columns and functions, not queries.")
    cols = WAREHOUSE[m.base_table]
    for c in ast.find_all(exp.Column):
        if c.name not in cols:
            raise CompileError("ValidationError", f"Column '{c.name}' doesn't exist in {m.base_table}. Available: {', '.join(cols)}.")
    return SemanticASTCompiler.compile_metric(m, dialect)


# ---- 7-day dry run on a seeded in-memory demo warehouse (SQLite) ----
def _seed(conn: sqlite3.Connection, today: date):
    rng = random.Random(7)  # deterministic demo data
    # REAL columns on purpose: SQLite integer division would turn ratios into 0
    conn.execute("CREATE TABLE fct_orders (order_id TEXT, item_price REAL, quantity REAL, returned_items_count REAL, total_items_ordered REAL, created_at TEXT)")
    conn.execute("CREATE TABLE finance_ledger (entry_id TEXT, revenue REAL, operating_income REAL, one_off_costs REAL, created_at TEXT)")
    for back in range(13, -1, -1):
        d = (today - timedelta(days=back)).isoformat()
        for i in range(25):
            q = float(rng.randint(1, 4))
            conn.execute("INSERT INTO fct_orders VALUES (?,?,?,?,?,?)",
                         (f"o{d}-{i}", round(rng.uniform(15, 220), 2), q, q if rng.random() < 0.12 else 0.0, q, d))
        for i in range(6):
            rev = rng.uniform(5000, 20000)
            conn.execute("INSERT INTO finance_ledger VALUES (?,?,?,?,?)",
                         (f"e{d}-{i}", rev, rev * rng.uniform(0.1, 0.3), rng.uniform(0, 1500), d))


def _run(conn, metric: MetricDefinition, dialect: str, start: date, end: date) -> Optional[float]:
    sql = SemanticASTCompiler.compile_metric(metric, dialect, start_date=start.isoformat(), end_date=end.isoformat())
    try:
        return conn.execute(sqlglot.transpile(sql, read=dialect, write="sqlite")[0]).fetchone()[0]
    except (sqlite3.Error, SqlglotError) as e:
        raise CompileError("WarehouseError", f"The test query failed: {e}") from e


def _variance(prod, draft) -> Optional[float]:
    return None if not prod or draft is None else round((draft - prod) / abs(prod) * 100, 2) + 0.0  # +0.0: no "-0.0"


def _simulate(prod: Optional[MetricDefinition], draft: MetricDefinition, dialect: str) -> dict:
    today = date.today()
    conn = sqlite3.connect(":memory:")
    try:
        _seed(conn, today)

        def row(label, s, e):
            p = _run(conn, prod, dialect, s, e) if prod else None  # new metric: nothing to compare against
            d = _run(conn, draft, dialect, s, e)
            return {"label": label, "production": p, "draft": d, "variance_pct": _variance(p, d)}

        days = [today - timedelta(days=i) for i in range(6, -1, -1)]
        return {"days": [row(d.isoformat(), d, d) for d in days], "total": row("7-day total", days[0], days[-1])}
    finally:
        conn.close()


async def simulate(prod: Optional[MetricDefinition], draft: MetricDefinition, dialect: str) -> dict:
    return await asyncio.to_thread(_simulate, prod, draft, dialect)
