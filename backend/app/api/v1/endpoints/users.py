from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.database import get_db
from app.schemas.user import UserOut, UserAdminUpdate
from app.crud import user as crud_user
from app.api.v1.dependencies import get_current_user, require_coordinator, require_admin
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/", response_model=List[UserOut])
async def get_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_coordinator),
):
    return await crud_user.get_all(db, include_inactive=True)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    data: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = await crud_user.update(db, user_id, data)
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")
    return user