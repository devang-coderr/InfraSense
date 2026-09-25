"""
InfraSense backend entrypoint.

Run with:  uvicorn app.main:app --reload
Docs at:   http://localhost:8000/docs
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.storage.local_storage import MEDIA_DIR
from app.routes import (
    auth,
    users,
    departments,
    media,
    issues,
    citizen,
    authority,
    work_orders,
    analytics,
    predictions,
    notifications,
)

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="InfraSense API",
    description="Backend for the InfraSense citizen infrastructure reporting platform.",
    version="1.0.0",
)

# CORS: only the origins listed in .env's CORS_ORIGINS may call this API
# from a browser. See README "CORS" for why this matters.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# Serves uploaded files saved by LocalStorage at /media/<filename>.
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(media.router)
app.include_router(issues.router)
app.include_router(citizen.router)
app.include_router(authority.router)
app.include_router(work_orders.router)
app.include_router(analytics.router)
app.include_router(predictions.router)
app.include_router(notifications.router)


@app.get("/")
def root():
    return {"service": "InfraSense API", "status": "running", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
