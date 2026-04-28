"""
Utilidades de seguridad: JWT, dependencias de auth.
Opcional - activa si el reto lo requiere.
(Supabase también gestiona auth, usa lo que te convenga)
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Genera un JWT."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decodifica y valida un JWT."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
