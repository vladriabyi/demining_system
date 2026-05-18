from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.report import CompletionReport
from app.models.request import DeminingRequest, RequestStatus
from app.models.brigade import BrigadeStatus
from app.schemas.report import ReportCreate
from app.schemas.brigade import BrigadeUpdate


# Статуси, при яких бригада вважається зайнятою активною роботою
_ACTIVE_STATUSES = {
    RequestStatus.pending,
    RequestStatus.under_review,
    RequestStatus.approved,
    RequestStatus.in_progress,
}


async def get_by_request(db: AsyncSession, request_id: int) -> CompletionReport | None:
    result = await db.execute(
        select(CompletionReport)
        .options(selectinload(CompletionReport.submitter))
        .where(CompletionReport.request_id == request_id)
    )
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession,
    request_id: int,
    submitted_by: int,
    data: ReportCreate,
) -> CompletionReport:
    report = CompletionReport(
        request_id=request_id,
        submitted_by=submitted_by,
        **data.model_dump(),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return await get_by_request(db, request_id)  # type: ignore


async def create_with_completion(
    db: AsyncSession,
    req: DeminingRequest,
    submitted_by: int,
    data: ReportCreate,
) -> CompletionReport:
    """
    Атомарна операція: створює звіт, завершує заявку та
    автоматично звільняє бригаду, якщо більше немає активних задач.
    """
    # 1. Зберігаємо звіт
    report = await create(db, req.id, submitted_by, data)

    # 2. Примусово завершуємо заявку через CRUD (зі збереженням audit log і сповіщень)
    from app.crud.request import force_complete
    completed_req = await force_complete(db, req, submitted_by)

    # 3. Якщо бригада призначена — перевіряємо чи залишились активні задачі
    if completed_req and completed_req.brigade_id:
        from app.crud.brigade import get_by_id as get_brigade, update as update_brigade
        brigade = await get_brigade(db, completed_req.brigade_id)
        if brigade and brigade.status == BrigadeStatus.busy:
            has_active = any(
                r.id != req.id and r.status in _ACTIVE_STATUSES
                for r in (brigade.requests or [])
            )
            if not has_active:
                await update_brigade(db, brigade, BrigadeUpdate(status=BrigadeStatus.available))

    return report
