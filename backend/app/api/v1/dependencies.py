from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.security import decode_token
from app.crud import user as crud_user
from app.models.user import User, UserRole


bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user = await crud_user.get_by_id(db, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def require_staff(user: User = Depends(get_current_user)) -> User:
    """Оператор, координатор або адмін. Цивільний доступу не має."""
    if user.role == UserRole.civilian:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Staff access required")
    return user


async def require_coordinator(user: User = Depends(get_current_user)) -> User:
    """Координатор або адмін."""
    if user.role not in (UserRole.coordinator, UserRole.admin):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Coordinator role required")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Тільки адмін."""
    if user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    return user