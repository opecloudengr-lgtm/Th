import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings

logging.basicConfig(level=logging.INFO if not settings.DEBUG else logging.DEBUG)

app = FastAPI(
    title=settings.APP_NAME,
    description="Smart event registration, ticketing and access control platform.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

try:
    app.mount("/media", StaticFiles(directory=settings.LOCAL_MEDIA_DIR), name="media")
except RuntimeError:
    pass


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}
