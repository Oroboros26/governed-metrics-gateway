import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

import yaml
from fastapi import FastAPI
from fastapi.responses import FileResponse

from app.core import proposals
from app.core.graph import graph_manager
from app.interface.mcp import mcp_router
from app.interface.rest_api import rest_router
from app.schemas.metrics import SemanticLayerConfig

CONFIG_PATH = Path(os.environ.get("SEMANTIX_CONFIG", Path(__file__).parent.parent / "test_metrics.yaml"))


async def load_config(path: Path = CONFIG_PATH):
    text = await asyncio.to_thread(path.read_text, encoding="utf-8")
    cfg = SemanticLayerConfig(**yaml.safe_load(text))
    cfg.metrics = await asyncio.to_thread(proposals.replay, cfg.metrics)
    graph_manager.load_configuration(cfg)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await load_config()  # a bad config aborts startup before the port listens
    yield


app = FastAPI(title="Semantix Data Plane", lifespan=lifespan)
app.include_router(rest_router)
app.include_router(mcp_router)


@app.get("/", include_in_schema=False)
async def catalog():
    return FileResponse(Path(__file__).parent / "static" / "index.html")
