"""
Rutas de health check y estado del servidor.
"""

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Endpoint de health check."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "ai_provider": settings.ai_provider,
        "supabase": "connected" if settings.has_supabase else "not configured",
    }


@router.get("/")
async def root():
    """Endpoint raíz."""
    return {
        "message": f"🌍 {settings.APP_NAME} API - Hackathon EuroGenAI",
        "docs": "/docs",
        "health": "/health",
    }
