from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.brigade import Brigade
from app.models.user import User
from app.schemas.brigade import BrigadeCreate, BrigadeUpdate


async def get_all(db: AsyncSession) -> list[Brigade]:
    result = await db.execute(
        select(Brigade)
        .options(selectinload(Brigade.members), selectinload(Brigade.requests))
        .order_by(Brigade.number)  # стабільний порядок
    )
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, brigade_id: int) -> Brigade | None:
    result = await db.execute(
        select(Brigade)
        .options(selectinload(Brigade.members), selectinload(Brigade.requests))
        .where(Brigade.id == brigade_id)
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, data: BrigadeCreate) -> Brigade:
    brigade = Brigade(
        name=data.name,
        number=data.number,
        status=data.status,
        specialization=data.specialization,
    )
    if data.member_ids:
        members_result = await db.execute(select(User).where(User.id.in_(data.member_ids)))
        brigade.members = list(members_result.scalars().all())

    db.add(brigade)
    await db.commit()
    await db.refresh(brigade)
    return await get_by_id(db, brigade.id)  # type: ignore


async def update(db: AsyncSession, brigade: Brigade, data: BrigadeUpdate) -> Brigade:
    if data.name           is not None: brigade.name           = data.name
    if data.number         is not None: brigade.number         = data.number
    if data.status         is not None: brigade.status         = data.status
    if data.specialization is not None: brigade.specialization = data.specialization

    if data.member_ids is not None:
        members_result = await db.execute(select(User).where(User.id.in_(data.member_ids)))
        brigade.members = list(members_result.scalars().all())

    await db.commit()
    await db.refresh(brigade)
    return await get_by_id(db, brigade.id)  # type: ignore


async def delete(db: AsyncSession, brigade: Brigade) -> None:
    await db.delete(brigade)
    await db.commit()
