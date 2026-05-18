from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import selectinload
from typing import Optional, List
from fastapi import HTTPException

from app.models.request import (
    DeminingRequest, RequestStatus, Priority,
    RequestStatusHistory, VALID_TRANSITIONS
)
from app.models.user import User, UserRole
from app.models.brigade import Brigade
from app.schemas.request import RequestCreate, RequestUpdate


# ─── helpers ──────────────────────────────────────────────────────────────────

def _q():
    """Базовий запит із завантаженням пов'язаних об'єктів."""
    return select(DeminingRequest).options(
        selectinload(DeminingRequest.requester),
        selectinload(DeminingRequest.assignee),
        selectinload(DeminingRequest.status_history),
        selectinload(DeminingRequest.brigade),  # потрібно для Telegram notify
    )


def _make_point_wkt(longitude: float, latitude: float) -> str:
    """Формує WKT-рядок для PostGIS POINT у форматі EWKT (включає SRID 4326)."""
    return f"SRID=4326;POINT({longitude} {latitude})"


def _validate_status_transition(current: RequestStatus, new: RequestStatus) -> None:
    """
    Перевіряє допустимість переходу між статусами.
    Реалізує 6-етапний життєвий цикл заявки (підрозділ 1.1.2).
    """
    allowed = VALID_TRANSITIONS.get(current, set())
    if new not in allowed:
        allowed_names = ", ".join(s.value for s in allowed) or "жодного"
        raise HTTPException(
            status_code=400,
            detail=(
                f"Неприпустимий перехід статусу: «{current.value}» → «{new.value}». "
                f"Допустимі переходи з «{current.value}»: {allowed_names}."
            ),
        )


async def _validate_assignee(db: AsyncSession, assignee_id: int) -> None:
    """
    Перевіряє що виконавець є staff-користувачем (оператор/координатор/адмін).
    Цивільний не може бути призначений виконавцем заявки.
    """
    assignee = await db.get(User, assignee_id)
    if not assignee:
        raise HTTPException(status_code=404, detail="Виконавця не знайдено.")
    if assignee.role == UserRole.civilian:
        raise HTTPException(
            status_code=400,
            detail="Виконавцем може бути лише оператор, координатор або адміністратор."
        )


async def _log_status_change(
    db: AsyncSession,
    request_id: int,
    old_status: RequestStatus,
    new_status: RequestStatus,
    changed_by_id: int,
    comment: Optional[str] = None,
) -> None:
    """Записує зміну статусу до журналу змін (audit log)."""
    entry = RequestStatusHistory(
        request_id=request_id,
        old_status=old_status.value,
        new_status=new_status.value,
        changed_by=changed_by_id,
        comment=comment,
    )
    db.add(entry)


# ─── CRUD operations ──────────────────────────────────────────────────────────

async def get_all(db: AsyncSession, current_user: User) -> List[DeminingRequest]:
    q = _q()
    if current_user.role == UserRole.civilian:
        q = q.where(DeminingRequest.requester_id == current_user.id)
    r = await db.execute(q.order_by(DeminingRequest.created_at.desc()))
    return list(r.scalars().all())


async def get_by_id(db: AsyncSession, rid: int) -> Optional[DeminingRequest]:
    r = await db.execute(_q().where(DeminingRequest.id == rid))
    return r.scalar_one_or_none()


async def create(
    db: AsyncSession,
    data: RequestCreate,
    requester_id: int,
) -> DeminingRequest:
    req = DeminingRequest(
        **data.model_dump(),
        requester_id=requester_id,
        priority=Priority.medium,           # пріоритет завжди medium при створенні
        location=_make_point_wkt(data.longitude, data.latitude),
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    # Записуємо початковий статус до журналу
    await _log_status_change(
        db, req.id,
        old_status=RequestStatus.pending,
        new_status=RequestStatus.pending,
        changed_by_id=requester_id,
        comment="Заявку створено",
    )
    await db.commit()

    return await get_by_id(db, req.id)


async def update(
    db: AsyncSession,
    req: DeminingRequest,
    data: RequestUpdate,
    current_user_id: int,
) -> DeminingRequest:
    changes = data.model_dump(exclude_unset=True)
    comment = changes.pop("comment", None)

    # Валідація переходу статусу
    if "status" in changes:
        new_status = changes["status"]
        _validate_status_transition(req.status, new_status)
        await _log_status_change(
            db, req.id,
            old_status=req.status,
            new_status=new_status,
            changed_by_id=current_user_id,
            comment=comment,
        )

    # Валідація виконавця
    if "assigned_to_id" in changes and changes["assigned_to_id"] is not None:
        await _validate_assignee(db, changes["assigned_to_id"])

    should_notify = "assigned_to_id" in changes or "status" in changes or "brigade_id" in changes

    for k, v in changes.items():
        setattr(req, k, v)

    await db.commit()
    await db.refresh(req)
    refreshed = await get_by_id(db, req.id)

    if should_notify and refreshed:
        from app.core.telegram import notify_request_updated
        assignee_name = refreshed.assignee.full_name if refreshed.assignee else None
        brigade_name  = refreshed.brigade.name       if refreshed.brigade  else None
        await notify_request_updated(
            request_id=refreshed.id,
            title=refreshed.title,
            location_name=refreshed.location_name,
            assignee_name=assignee_name,
            brigade_name=brigade_name,
            status=refreshed.status.value,
        )
        # Email до заявника при зміні статусу
        if "status" in changes and refreshed.requester:
            try:
                from app.core.email import send_status_change_email
                await send_status_change_email(
                    to=refreshed.requester.email,
                    to_name=refreshed.requester.full_name,
                    request_id=refreshed.id,
                    request_title=refreshed.title,
                    location=refreshed.location_name,
                    status=refreshed.status.value,
                )
            except Exception:
                pass

    return refreshed


async def force_complete(
    db: AsyncSession,
    req: "DeminingRequest",
    current_user_id: int,
    comment: str = "Завершальний звіт подано сапером",
) -> "DeminingRequest":
    """Примусово завершує заявку (для звіту сапера), оминаючи стандартну перевірку переходів."""
    old_status = req.status  # зберігаємо enum, не str
    req.status = RequestStatus.completed
    await db.commit()

    await _log_status_change(
        db, req.id,
        old_status=old_status,
        new_status=RequestStatus.completed,
        changed_by_id=current_user_id,
        comment=comment,
    )

    refreshed = await get_by_id(db, req.id)
    if refreshed:
        from app.core.telegram import notify_request_updated
        from app.core.email import send_completion_report_email
        assignee_name = refreshed.assignee.full_name if refreshed.assignee else None
        brigade_name  = refreshed.brigade.name       if refreshed.brigade  else None
        await notify_request_updated(
            request_id=refreshed.id,
            title=refreshed.title,
            location_name=refreshed.location_name,
            assignee_name=assignee_name,
            brigade_name=brigade_name,
            status="completed",
        )
        if refreshed.requester:
            try:
                await send_completion_report_email(
                    to=refreshed.requester.email,
                    to_name=refreshed.requester.full_name,
                    request_id=refreshed.id,
                    request_title=refreshed.title,
                    location=refreshed.location_name,
                )
            except Exception:
                pass
    return refreshed


async def set_photo(
    db: AsyncSession,
    req: DeminingRequest,
    photo_path: str,
) -> DeminingRequest:
    req.photo_path = photo_path
    await db.commit()
    await db.refresh(req)
    return await get_by_id(db, req.id)


async def delete(db: AsyncSession, req: DeminingRequest) -> None:
    await db.delete(req)
    await db.commit()


# ─── PostGIS spatial queries ──────────────────────────────────────────────────

async def find_nearby(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    radius_m: float = 200,
    exclude_id: Optional[int] = None,
) -> list[dict]:
    """
    Пошук заявок у радіусі radius_m метрів від вказаної точки.
    Використовує PostGIS ST_DWithin з типом geography (точна відстань у метрах).
    Застосовується для виявлення потенційних дублікатів (підрозділ 1.1.2).

    Geography vs Geometry:
      - Geometry: плоска геометрія, одиниці — градуси (неточно для відстаней)
      - Geography: сферична геометрія, одиниці — метри (точно)
    """
    point_wkt = f"POINT({longitude} {latitude})"

    sql = text("""
        SELECT
            id,
            title,
            status,
            latitude,
            longitude,
            location_name,
            ST_Distance(
                location::geography,
                ST_GeographyFromText(:point_wkt)
            ) AS distance_m
        FROM demining_requests
        WHERE
            location IS NOT NULL
            AND ST_DWithin(
                location::geography,
                ST_GeographyFromText(:point_wkt),
                :radius_m
            )
            AND (:exclude_id IS NULL OR id != :exclude_id)
        ORDER BY distance_m ASC
        LIMIT 10
    """)

    result = await db.execute(
        sql,
        {"point_wkt": point_wkt, "radius_m": radius_m, "exclude_id": exclude_id}
    )
    rows = result.mappings().all()
    return [dict(row) for row in rows]


# ─── Dashboard stats (один запит замість шести) ───────────────────────────────

async def get_dashboard_stats(db: AsyncSession) -> dict:
    """
    Оптимізована версія: один SQL-запит з умовною агрегацією
    замість шести окремих SELECT COUNT(*).
    """
    stats_sql = text("""
        SELECT
            COUNT(*)                                                          AS total_requests,
            COUNT(*) FILTER (WHERE status = 'pending')                        AS pending_requests,
            COUNT(*) FILTER (WHERE status = 'in_progress')                    AS in_progress_requests,
            COUNT(*) FILTER (WHERE status = 'completed')                      AS completed_requests,
            COUNT(*) FILTER (WHERE priority = 'critical')                     AS critical_requests
        FROM demining_requests
    """)

    row = (await db.execute(stats_sql)).mappings().one()

    total_brigades = await db.scalar(
        select(func.count(Brigade.id))
    ) or 0

    return {
        "total_requests":       int(row["total_requests"]),
        "pending_requests":     int(row["pending_requests"]),
        "in_progress_requests": int(row["in_progress_requests"]),
        "completed_requests":   int(row["completed_requests"]),
        "critical_requests":    int(row["critical_requests"]),
        "total_brigades":       total_brigades,
    }
