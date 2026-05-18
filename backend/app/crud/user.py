from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from app.models.user import User
from app.schemas.user import UserRegister, UserAdminUpdate
from app.core.security import hash_password


async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
    r = await db.execute(select(User).where(User.email == email))
    return r.scalar_one_or_none()


async def get_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    r = await db.execute(select(User).where(User.id == user_id))
    return r.scalar_one_or_none()


async def get_all(db: AsyncSession, include_inactive: bool = False) -> List[User]:
    q = select(User)
    if not include_inactive:
        q = q.where(User.is_active == True)
    r = await db.execute(q)
    return list(r.scalars().all())


async def create(db: AsyncSession, data: UserRegister) -> User:
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update(db: AsyncSession, user_id: int, data: UserAdminUpdate) -> Optional[User]:
    user = await get_by_id(db, user_id)
    if not user:
        return None
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    await db.commit()
    await db.refresh(user)
    return user
