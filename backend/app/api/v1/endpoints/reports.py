from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.report import ReportCreate, ReportOut
from app.crud import report as crud_report
from app.crud import request as crud_req
from app.crud import brigade as crud_brigade
from app.models.brigade import BrigadeStatus
from app.schemas.brigade import BrigadeUpdate
from app.api.v1.dependencies import get_current_user, require_staff
from app.models.user import User
from app.models.request import RequestStatus

router = APIRouter(prefix="/requests", tags=["reports"])

ACTIVE = {RequestStatus.pending, RequestStatus.under_review, RequestStatus.approved, RequestStatus.in_progress}


@router.post("/{rid}/report", response_model=ReportOut, status_code=201)
async def submit_report(
    rid: int,
    data: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff),
):

    req = await crud_req.get_by_id(db, rid)
    if not req:
        raise HTTPException(404, "Заявку не знайдено")

    if req.status not in {RequestStatus.in_progress, RequestStatus.approved}:
        raise HTTPException(400, f"Звіт можна подати лише для заявки зі статусом 'В роботі' або 'Затверджено' (поточний: {req.status.value})")

    existing = await crud_report.get_by_request(db, rid)
    if existing:
        raise HTTPException(409, "Звіт для цієї заявки вже існує")

    # Створюємо звіт
    report = await crud_report.create(db, rid, current_user.id, data)

    # Примусово завершуємо заявку
    completed_req = await crud_req.force_complete(db, req, current_user.id)

    # Перевіряємо статус бригади
    if completed_req and completed_req.brigade_id:
        brigade = await crud_brigade.get_by_id(db, completed_req.brigade_id)
        if brigade:
            remaining = [
                r for r in (brigade.requests or [])
                if r.id != rid and r.status in ACTIVE
            ]
            if not remaining and brigade.status == BrigadeStatus.busy:
                await crud_brigade.update(db, brigade, BrigadeUpdate(status=BrigadeStatus.available))

    return report


@router.get("/{rid}/report", response_model=ReportOut)
async def get_report(
    rid: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    report = await crud_report.get_by_request(db, rid)
    if not report:
        raise HTTPException(404, "Звіт не знайдено")
    return report
