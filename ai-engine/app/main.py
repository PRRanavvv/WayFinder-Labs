from fastapi import FastAPI

from .api.routes import router
from .core.config import ENGINE_VERSION

app = FastAPI(
    title="WayFinder AI Engine",
    version=ENGINE_VERSION,
    description="Python/FastAPI travel-intelligence service for WayFinder.",
)
app.include_router(router)
