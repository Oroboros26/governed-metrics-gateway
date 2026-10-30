from typing import Dict, List

import networkx as nx

from app.schemas.metrics import MetricDefinition, SemanticLayerConfig


class SemanticGraphManager:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.metrics_registry: Dict[str, MetricDefinition] = {}
        self.active_dialect = "snowflake"
        self.revision = 0

    def load_configuration(self, config: SemanticLayerConfig):
        """Validate into a temp graph, commit only if clean (a failed load leaves live state untouched)."""
        temp_graph = nx.DiGraph()
        for key, definition in config.metrics.items():
            if key != definition.name:
                raise ValueError(f"Compilation Error: Key '{key}' does not match metric name '{definition.name}'.")
            temp_graph.add_node(key, definition=definition)

        for key, definition in config.metrics.items():
            for dep in definition.dependencies:
                if dep not in config.metrics:
                    raise ValueError(f"Compilation Error: Broken Lineage. Metric '{key}' depends on non-existent metric '{dep}'.")
                temp_graph.add_edge(dep, key)  # upstream -> downstream

        if not nx.is_directed_acyclic_graph(temp_graph):
            cycles = list(nx.simple_cycles(temp_graph))
            raise ValueError(f"Compilation Error: Circular Loop Detected inside semantic view definition: {cycles}")

        self.graph = temp_graph
        self.metrics_registry = config.metrics
        self.active_dialect = config.dialect
        self.revision += 1

    def get_downstream_impact(self, metric_name: str) -> List[str]:
        if metric_name not in self.graph:
            return []
        return sorted(nx.descendants(self.graph, metric_name))


graph_manager = SemanticGraphManager()  # shared by the REST and MCP interfaces
