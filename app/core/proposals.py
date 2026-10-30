import os
from pathlib import Path

import yaml

from app.schemas.metrics import MetricDefinition

# Proposals are the GitOps stand-in: one YAML file per change. The baseline config is never edited;
# approved ("live") proposals are replayed over it at startup.
# Limitation: single-process, file-per-proposal. Move to a real queue/DB when more than one server runs.


def directory() -> Path:
    return Path(os.environ.get("SEMANTIX_SUBMISSIONS", Path(__file__).parent.parent.parent / "submissions"))


def read_all() -> list:
    out = []
    for f in sorted(directory().glob("*.yaml")):  # filenames end in a UTC timestamp => chronological
        doc = yaml.safe_load(f.read_text(encoding="utf-8"))
        doc["proposal"]["id"] = f.stem
        out.append(doc)
    return out


def write(doc: dict):
    path = directory() / f"{doc['proposal']['id']}.yaml"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True), encoding="utf-8")


def apply(metrics: dict, doc: dict) -> dict:
    m = doc["metric"]
    if doc["proposal"]["action"] == "delete":
        metrics.pop(m["name"], None)
    else:
        metrics[m["name"]] = MetricDefinition(**m)
    return metrics


def replay(metrics: dict) -> dict:
    for doc in read_all():
        if doc["proposal"]["status"] == "live":
            apply(metrics, doc)
    return metrics
