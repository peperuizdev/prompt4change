"""
Servicio de lógica de negocio para ODS.
Aquí va la lógica específica del reto.
Usa Supabase para persistencia.
"""

from typing import Any, Dict, List, Optional

from app.database.connection import get_supabase
from app.services.ai_service import ai_service


class ODSService:
    """
    Lógica de negocio relacionada con ODS.
    Operaciones CRUD con Supabase + análisis con IA.
    """

    # --- CRUD Proyectos (Supabase) ---

    async def create_project(
        self,
        title: str,
        description: str,
        ods_goals: Optional[str] = None,
        category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Crea un nuevo proyecto y analiza con IA."""
        # Análisis automático con IA
        ai_analysis = None
        if description:
            ai_analysis = await self.analyze_with_ai(title, description)

        project_data = {
            "title": title,
            "description": description,
            "ods_goals": ods_goals,
            "category": category,
            "ai_analysis": ai_analysis,
            "status": "draft",
        }

        db = get_supabase()
        if db:
            result = db.table("projects").insert(project_data).execute()
            return result.data[0] if result.data else project_data

        # Fallback si no hay Supabase (devuelve los datos sin persistir)
        project_data["id"] = 0
        return project_data

    async def get_projects(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """Lista todos los proyectos."""
        db = get_supabase()
        if not db:
            return []

        result = (
            db.table("projects")
            .select("*")
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return result.data or []

    async def get_project(self, project_id: int) -> Optional[Dict[str, Any]]:
        """Obtiene un proyecto por ID."""
        db = get_supabase()
        if not db:
            return None

        result = db.table("projects").select("*").eq("id", project_id).execute()
        return result.data[0] if result.data else None

    # --- IA ---

    async def analyze_with_ai(self, title: str, description: str) -> str:
        """
        Analiza un proyecto/propuesta con IA.
        Identifica ODS relevantes, viabilidad, impacto.
        """
        prompt = f"""Analiza la siguiente propuesta de proyecto para desarrollo sostenible local:

Título: {title}
Descripción: {description}

Proporciona un análisis breve que incluya:
1. ODS (Objetivos de Desarrollo Sostenible) más relevantes
2. Impacto potencial en la comunidad local
3. Viabilidad y sugerencias de mejora
4. Posibles indicadores de éxito

Responde de forma concisa y estructurada."""

        return await ai_service.simple_prompt(prompt)

    async def classify_ods(self, text: str) -> str:
        """Clasifica un texto según los ODS más relevantes."""
        prompt = f"""Dado el siguiente texto, identifica los 3 ODS (Objetivos de Desarrollo Sostenible) 
más relevantes. Devuelve solo los números separados por comas (ej: "11,13,7").

Texto: {text}

ODS relevantes:"""
        return await ai_service.simple_prompt(prompt, temperature=0.3)


# Instancia singleton
ods_service = ODSService()
