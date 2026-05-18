from __future__ import annotations
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey, Enum as PgEnum, Table, Column, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
import enum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.request import DeminingRequest


class BrigadeStatus(str, enum.Enum):
    available   = "available"    # Вільна
    busy        = "busy"         # В роботі
    unavailable = "unavailable"  # Недоступна


# Таблиця зв'язку бригада ↔ сапери
brigade_members = Table(
    "brigade_members",
    Base.metadata,
    Column("brigade_id", Integer, ForeignKey("brigades.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id",    Integer, ForeignKey("users.id",    ondelete="CASCADE"), primary_key=True),
)


class Brigade(Base):
    __tablename__ = "brigades"

    id:             Mapped[int]           = mapped_column(primary_key=True)
    name:           Mapped[str]           = mapped_column(String(255), nullable=False)
    number:         Mapped[str]           = mapped_column(String(50),  nullable=False, unique=True)
    status:         Mapped[BrigadeStatus] = mapped_column(PgEnum(BrigadeStatus), default=BrigadeStatus.available)
    specialization: Mapped[str | None]    = mapped_column(Text, nullable=True)

    # Особовий склад (сапери)
    members: Mapped[List["User"]] = relationship(
        "User",
        secondary=brigade_members,
        back_populates="brigades",
        lazy="selectin",
    )

    # Поточні заявки бригади
    requests: Mapped[List["DeminingRequest"]] = relationship(
        "DeminingRequest",
        back_populates="brigade",
        lazy="selectin",
    )
