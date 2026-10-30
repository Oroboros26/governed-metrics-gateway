from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class MetricDefinition(BaseModel):
    name: str = Field(..., pattern=r"^[a-z][a-z0-9_]*$", description="Unique snake_case identifier")
    base_table: str = Field(..., description="The underlying physical database table name")
    expression: str = Field(..., description="Mathematical expression (e.g., SUM(sales) / SUM(orders))")
    dependencies: List[str] = Field(default_factory=list, description="Other semantic metrics this relies on")
    description: Optional[str] = None
    domain: str = Field("ecommerce", description="Business domain, used for role scoping")
    time_column: str = Field("created_at", pattern=r"^[A-Za-z_][A-Za-z0-9_]*$", description="Column used for date filters")


class SemanticLayerConfig(BaseModel):
    version: str
    dialect: str = Field("snowflake", description="Target warehouse: snowflake, bigquery, or databricks")
    metrics: Dict[str, MetricDefinition]
