"""
Utilidades generales del backend.
Funciones helper reutilizables.
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def now_utc() -> datetime:
    """Devuelve la fecha/hora actual en UTC."""
    return datetime.now(timezone.utc)


def safe_json_parse(text: str, default: Any = None) -> Any:
    """Intenta parsear JSON, devuelve default si falla."""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return default


def truncate_text(text: str, max_length: int = 500) -> str:
    """Trunca un texto añadiendo '...' si es necesario."""
    if len(text) <= max_length:
        return text
    return text[: max_length - 3] + "..."


def build_context(
    location: Optional[str] = None,
    population: Optional[int] = None,
    ods_focus: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Construye un diccionario de contexto para enriquecer los prompts.
    Adapta los campos según el reto.
    """
    context = {}
    if location:
        context["ubicación"] = location
    if population:
        context["población"] = population
    if ods_focus:
        context["ODS prioritarios"] = ods_focus
    if extra:
        context.update(extra)
    return context


# =============================================
# AÑADE AQUÍ MÁS HELPERS SEGÚN NECESITES
# =============================================
