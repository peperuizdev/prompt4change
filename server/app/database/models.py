"""
Schemas de base de datos / Supabase.
Define los schemas Pydantic que mapean a las tablas de Supabase.

NOTA: Las tablas se crean en el dashboard de Supabase o con SQL.
Aquí van los schemas para validar datos en Python.

SQL para crear las tablas en Supabase (copia en el SQL Editor):

-- Conversaciones con IA
CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proyectos/propuestas ODS
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    ods_goals TEXT,
    category TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    ai_analysis TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilita RLS si quieres seguridad por usuario
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
"""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class ConversationSchema(BaseModel):
    """Schema para la tabla conversations."""

    id: Optional[int] = None
    user_id: Optional[str] = None
    role: str  # "user" | "assistant" | "system"
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class ProjectSchema(BaseModel):
    """Schema para la tabla projects."""

    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    ods_goals: Optional[str] = None  # ej: "11,13" (ODS relacionados)
    category: Optional[str] = None
    status: str = "draft"  # draft | active | completed
    ai_analysis: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# =============================================
# AÑADE AQUÍ MÁS SCHEMAS SEGÚN EL RETO:
#
# class MiSchema(BaseModel):
#     id: Optional[int] = None
#     ...
# =============================================
