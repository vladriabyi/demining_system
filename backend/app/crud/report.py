from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.report import CompletionReport
from app.schemas.report import ReportCreate


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
