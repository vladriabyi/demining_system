import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.db.database import get_db
from app.schemas.request import (
    RequestCreate,
    RequestUpdate,
    RequestOut,
    DashboardStatsOut,
    NearbyRequestOut,
)
from app.crud import request as crud
from app.api.v1.dependencies import get_current_user, require_staff
from app.models.user import User, UserRole

router = APIRouter(prefix="/requests", tags=["requests"])

UPLOAD_DIR       = "/app/uploads"
ALLOWED_TYPES    = {"image/jpeg", "image/png"}
MAX_FILE_SIZE    = 5 * 1024 * 1024   # 5 MB
DUPLICATE_RADIUS = 200               # метрів — поріг виявлення дублікатів


# ─── List & stats ─────────────────────────────────────────────────────────────

@router.get("/", response_model=List[RequestOut])
async def list_requests(
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
):
    return await crud.get_all(db, current_user)


@router.get("/stats", response_model=DashboardStatsOut)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _:  User         = Depends(get_current_user),
):
    return await crud.get_dashboard_stats(db)


# ─── PostGIS: пошук заявок поблизу (виявлення дублікатів) ───────────────────

@router.get("/nearby", response_model=List[NearbyRequestOut])
async def get_nearby_requests(
    lat:        float = Query(..., description="Широта точки пошуку"),
    lon:        float = Query(..., description="Довгота точки пошуку"),
    radius_m:   float = Query(DUPLICATE_RADIUS, description="Радіус пошуку в метрах"),
    exclude_id: Optional[int] = Query(None, description="ID заявки для виключення з результатів"),
    db:         AsyncSession = Depends(get_db),
    _:          User         = Depends(get_current_user),
):
    """
    Повертає заявки у заданому радіусі від точки.
    Використовується для:
      - виявлення потенційних дублікатів перед поданням нової заявки
      - кластеризації МНЗ на картографічній підоснові
    Реалізовано через PostGIS ST_DWithin з типом geography (метри).
    """
    rows = await crud.find_nearby(db, lat, lon, radius_m, exclude_id)
    return rows


# ─── Single request CRUD ──────────────────────────────────────────────────────

@router.get("/{rid}", response_model=RequestOut)
async def get_request(
    rid:          int,
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
):
    req = await crud.get_by_id(db, rid)
    if not req:
        raise HTTPException(404, "Заявку не знайдено")
    # Цивільний бачить лише свої заявки
    if current_user.role == UserRole.civilian and req.requester_id != current_user.id:
        raise HTTPException(403, "Доступ заборонено")
    return req


@router.post("/", response_model=RequestOut, status_code=201)
async def create_request(
    data:         RequestCreate,
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
):
    return await crud.create(db, data, current_user.id)


@router.patch("/{rid}", response_model=RequestOut)
async def update_request(
    rid:          int,
    data:         RequestUpdate,
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
):
    req = await crud.get_by_id(db, rid)
    if not req:
        raise HTTPException(404, "Заявку не знайдено")
    if current_user.role == UserRole.civilian and req.requester_id != current_user.id:
        raise HTTPException(403, "Доступ заборонено")
    if current_user.role == UserRole.civilian and req.status != "pending":
        raise HTTPException(403, "Редагування можливе лише у статусі «pending»")
    return await crud.update(db, req, data, current_user.id)


@router.post("/{rid}/photo", response_model=RequestOut)
async def upload_photo(
    rid:          int,
    file:         UploadFile   = File(...),
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
):
    req = await crud.get_by_id(db, rid)
    if not req:
        raise HTTPException(404, "Заявку не знайдено")
    if current_user.role == UserRole.civilian and req.requester_id != current_user.id:
        raise HTTPException(403, "Доступ заборонено")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Дозволено лише JPEG та PNG")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "Файл завеликий. Максимум 5 МБ")

    ext      = "jpg" if file.content_type == "image/jpeg" else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        f.write(contents)

    return await crud.set_photo(db, req, filename)


@router.delete("/{rid}", status_code=204)
async def delete_request(
    rid:          int,
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(get_current_user),
):
    req = await crud.get_by_id(db, rid)
    if not req:
        raise HTTPException(404, "Заявку не знайдено")
    if current_user.role == UserRole.civilian and req.requester_id != current_user.id:
        raise HTTPException(403, "Доступ заборонено")
    await crud.delete(db, req)
