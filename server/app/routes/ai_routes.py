"""
Rutas de IA y chat.
Endpoints para interactuar con los agentes de IA.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.ods_agent import ods_agent
from app.services.ai_service import ai_service
from app.services.ods_service import ods_service

router = APIRouter()


# --- Schemas de Request/Response ---


class ChatRequest(BaseModel):
    """Request para el chat."""
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    """Response del chat."""
    response: str
    agent: str = "ODS Agent"


class PromptRequest(BaseModel):
    """Request para un prompt simple."""
    prompt: str
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7


class ProjectCreate(BaseModel):
    """Request para crear un proyecto."""
    title: str
    description: str
    ods_goals: Optional[str] = None
    category: Optional[str] = None


# --- Endpoints de Chat ---


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """
    Chat con el agente ODS.
    Mantiene historial de conversación en memoria.
    """
    try:
        response = await ods_agent.process(
            user_input=request.message,
            context=request.context,
        )
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error del agente IA: {str(e)}")


@router.post("/prompt")
async def simple_prompt(request: PromptRequest):
    """
    Prompt simple sin historial.
    Útil para análisis puntuales, clasificación, etc.
    """
    try:
        response = await ai_service.simple_prompt(
            prompt=request.prompt,
            system_prompt=request.system_prompt
            or "Eres un asistente experto en desarrollo sostenible y ODS.",
            temperature=request.temperature or 0.7,
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de IA: {str(e)}")


@router.post("/chat/reset")
async def reset_chat():
    """Limpia el historial de conversación del agente."""
    ods_agent.clear_history()
    return {"message": "Historial de conversación eliminado"}


# --- Endpoints de Análisis ---


@router.post("/analyze")
async def analyze_text(request: ChatRequest):
    """Analiza un texto e identifica ODS relevantes."""
    try:
        classification = await ods_service.classify_ods(request.message)
        return {"ods_classification": classification, "original_text": request.message}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al analizar: {str(e)}")


# --- Endpoints de Proyectos ---


@router.post("/projects")
async def create_project(project: ProjectCreate):
    """Crea un proyecto con análisis IA automático."""
    try:
        new_project = await ods_service.create_project(
            title=project.title,
            description=project.description,
            ods_goals=project.ods_goals,
            category=project.category,
        )
        return new_project
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear proyecto: {str(e)}")


@router.get("/projects")
async def list_projects(skip: int = 0, limit: int = 50):
    """Lista todos los proyectos."""
    return await ods_service.get_projects(skip=skip, limit=limit)


@router.get("/projects/{project_id}")
async def get_project(project_id: int):
    """Obtiene un proyecto por ID."""
    project = await ods_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


# =============================================
# AÑADE AQUÍ MÁS ENDPOINTS SEGÚN EL RETO:
#
# @router.post("/mi-endpoint")
# async def mi_endpoint(request: MiRequest):
#     ...
# =============================================
