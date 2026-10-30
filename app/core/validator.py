from datetime import date
from typing import Awaitable, Callable, Optional

from sqlglot import exp, parse_one
from sqlglot.errors import SqlglotError

from app.schemas.metrics import MetricDefinition


class CompileError(Exception):
    """Structured failure: category + detail, safe to return to clients."""

    def __init__(self, category: str, message: str, errors: Optional[list] = None):
        super().__init__(message)
        self.category, self.message, self.errors = category, message, errors or []

    def to_dict(self) -> dict:
        return {"category": self.category, "message": self.message, "errors": self.errors}


def _syntax_error(e: SqlglotError) -> CompileError:
    # sqlglot ParseError carries line/col/description dicts
    details = [
        {k: err.get(k) for k in ("description", "line", "col", "highlight")}
        for err in getattr(e, "errors", [])
    ]
    return CompileError("SyntaxError", str(e).splitlines()[0], details)


class SemanticASTCompiler:
    @staticmethod
    def inject_divide_by_zero_protection(expression_str: str, dialect: str) -> exp.Expression:
        """Wrap every denominator in NULLIF(x, 0). NULLIF is valid on Snowflake, BigQuery and Databricks."""
        try:
            ast = parse_one(expression_str, read=dialect)
        except SqlglotError as e:
            raise _syntax_error(e) from e

        def wrap(node):
            if isinstance(node, exp.Div) and not isinstance(node.expression, exp.Nullif):
                node.set("expression", exp.Nullif(this=node.expression, expression=exp.Literal.number(0)))
            return node

        return ast.transform(wrap)

    @classmethod
    def compile_metric(
        cls,
        metric: MetricDefinition,
        dialect: str,
        time_filter_days: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> str:
        try:
            query = (
                exp.select(exp.alias_(cls.inject_divide_by_zero_protection(metric.expression, dialect), metric.name))
                .from_(exp.to_table(metric.base_table, dialect=dialect))
            )
            col = exp.column(metric.time_column)
            if time_filter_days is not None:
                days = int(time_filter_days)
                if days < 1:
                    raise CompileError("ValueError", "time_filter_days must be >= 1")
                lookback = exp.Sub(this=exp.CurrentDate(), expression=exp.Interval(this=exp.Literal.string(days), unit=exp.var("DAY")))
                query = query.where(exp.GTE(this=col.copy(), expression=lookback))
            try:  # ISO-validate, then emit as literals (never interpolate raw input)
                if start_date:
                    query = query.where(exp.GTE(this=col.copy(), expression=exp.Literal.string(date.fromisoformat(start_date).isoformat())))
                if end_date:
                    query = query.where(exp.LTE(this=col.copy(), expression=exp.Literal.string(date.fromisoformat(end_date).isoformat())))
            except ValueError as e:
                raise CompileError("ValueError", f"Invalid date, expected YYYY-MM-DD: {e}") from e
            return query.sql(dialect=dialect)
        except CompileError:
            raise
        except (SqlglotError, TypeError, ValueError) as e:
            raise CompileError("CompilationError", str(e).splitlines()[0]) from e


# Limitation: no warehouse driver in the MVP deps, so EXPLAIN is an injected async callable
# (sql -> estimated bytes). Swap in a Snowflake/BigQuery-backed one when execution lands.
ExplainFn = Callable[[str], Awaitable[int]]


async def check_cost(sql: str, explain: ExplainFn, max_bytes: int) -> int:
    """Run EXPLAIN first; refuse queries whose predicted bytes exceed the threshold."""
    try:
        est = await explain(f"EXPLAIN {sql}")
    except PermissionError as e:
        raise CompileError("PermissionError", str(e)) from e
    except TimeoutError as e:
        raise CompileError("TimeoutError", str(e)) from e
    except Exception as e:  # warehouse failures are categorised, never bubbled as stack traces
        raise CompileError("WarehouseError", str(e)) from e
    if est > max_bytes:
        raise CompileError("CostExceeded", f"Estimated {est} bytes exceeds limit {max_bytes}.")
    return est
