from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.report import ReportCreate, ReportOut
from app.crud import report as crud_report
from app.crud import request as crud_req
from app.api.v1.dependencies import get_current_user, require_staff
from app.models.user import User
from app.models.request import RequestStatus

router = APIRouter(prefix="/requests", tags=["reports"])

_SUBMITTABLE_STATUSES = {RequestStatus.in_progress, RequestStatus.approved}


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

    if req.status not in _SUBMITTABLE_STATUSES:
        raise HTTPException(
            400,
            f"Звіт можна подати лише для заявки зі статусом 'В роботі' або "
            f"'Затверджено' (поточний: {req.status.value})",
        )

    if await crud_report.get_by_request(db, rid):
        raise HTTPException(409, "Звіт для цієї заявки вже існує")

    return await crud_report.create_with_completion(db, req, current_user.id, data)


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
