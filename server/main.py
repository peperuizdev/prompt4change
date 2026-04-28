"""
EuroGenAI Hackathon - Backend Entry Point
==========================================
Servidor FastAPI genérico para soluciones ODS con IA.
Listo para adaptar al reto específico de la hackathon.
"""

from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.connection import init_supabase
from app.routes import ai_routes, health_routes, seacool_routes, aqualoop_routes, global_routes


frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
allowed_origins = list(settings.cors_origins_list)
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown events."""
    # --- Startup ---
    init_supabase()
    print(f"🚀 {settings.APP_NAME} backend iniciado en modo {settings.APP_ENV}")
    yield
    # --- Shutdown ---
    print(f"👋 {settings.APP_NAME} backend apagándose...")


app = FastAPI(
    title="SeaCool AI - Prompt4Change",
    description=(
        "Orquestador Multiagente para economía circular: "
        "Centro de Datos ↔ Comunidad costera (Almería). "
        "Refrigeración por absorción + Destilación de agua marina."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Rutas ---
app.include_router(health_routes.router, tags=["Health"])
app.include_router(ai_routes.router, prefix="/api/ai", tags=["AI"])
app.include_router(
    seacool_routes.router,
    prefix="/api/seacool",
    tags=["SeaCool AI"],
)
app.include_router(
    aqualoop_routes.router,
    prefix="/api/aqualoop",
    tags=["AquaLoop AI"],
)
app.include_router(
    global_routes.router,
    prefix="/api/global",
    tags=["SeaCool Global"],
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.APP_PORT,
        reload=settings.APP_DEBUG and settings.APP_ENV == "development",
    )
