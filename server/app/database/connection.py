"""
Conexión a Supabase.
Cliente singleton reutilizable en toda la app.
"""

from typing import Optional

from supabase import Client, create_client

from app.core.config import settings

# Cliente singleton
_supabase_client: Optional[Client] = None


def init_supabase() -> Optional[Client]:
    """
    Inicializa el cliente de Supabase.
    Llamado al arrancar la app desde main.py lifespan.
    """
    global _supabase_client

    if not settings.has_supabase:
        print("⚠️  Supabase no configurado. Configura SUPABASE_URL y SUPABASE_KEY en .env")
        return None

    _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    print("✅ Supabase conectado")
    return _supabase_client


def get_supabase() -> Optional[Client]:
    """
    Devuelve el cliente de Supabase.
    Úsalo como dependency en las rutas:
    
        from app.database.connection import get_supabase
        
        @router.get("/data")
        async def get_data():
            db = get_supabase()
            result = db.table("mi_tabla").select("*").execute()
            return result.data
    """
    global _supabase_client

    if _supabase_client is None and settings.has_supabase:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

    return _supabase_client


def get_supabase_admin() -> Optional[Client]:
    """
    Cliente con service_role key (acceso total, sin RLS).
    Usar SOLO para operaciones de backend que necesiten bypass de seguridad.
    """
    if not settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_SERVICE_KEY == "tu-service-role-key-aqui":
        return get_supabase()

    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
