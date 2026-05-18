from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.database import get_db
from app.schemas.brigade import BrigadeCreate, BrigadeUpdate, BrigadeOut
from app.crud import brigade as crud
from app.api.v1.dependencies import get_current_user, require_coordinator
from app.models.user import User

router = APIRouter(prefix="/brigades", tags=["brigades"])


@router.get("/", response_model=List[BrigadeOut])
async def list_brigades(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await crud.get_all(db)


@router.get("/{bid}", response_model=BrigadeOut)
async def get_brigade(
    bid: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    b = await crud.get_by_id(db, bid)
    if not b:
        raise HTTPException(404, "Бригаду не знайдено")
    return b


@router.post("/", response_model=BrigadeOut, status_code=201)
async def create_brigade(
    data: BrigadeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_coordinator),
):
    return await crud.create(db, data)


@router.patch("/{bid}", response_model=BrigadeOut)
async def update_brigade(
    bid: int,
    data: BrigadeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_coordinator),
):
    b = await crud.get_by_id(db, bid)
    if not b:
        raise HTTPException(404, "Бригаду не знайдено")
    return await crud.update(db, b, data)


@router.delete("/{bid}", status_code=204)
async def delete_brigade(
    bid: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_coordinator),
):
    b = await crud.get_by_id(db, bid)
    if not b:
        raise HTTPException(404, "Бригаду не знайдено")
    await crud.delete(db, b)
