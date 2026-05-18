from __future__ import annotations
from typing import TYPE_CHECKING
from sqlalchemy import String, Text, Float, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.database import Base
from datetime import datetime

if TYPE_CHECKING:
    from app.models.request import DeminingRequest
    from app.models.user import User


class CompletionReport(Base):
    __tablename__ = "completion_reports"

    id:                    Mapped[int]          = mapped_column(primary_key=True)
    request_id:            Mapped[int]          = mapped_column(ForeignKey("demining_requests.id", ondelete="CASCADE"), unique=True, nullable=False)
    explosive_type_found:  Mapped[str]          = mapped_column(String(100), nullable=False)
    quantity:              Mapped[int]          = mapped_column(Integer, default=1)
    area_cleared_m2:       Mapped[float | None] = mapped_column(Float, nullable=True)
    time_spent_hours:      Mapped[float | None] = mapped_column(Float, nullable=True)
    neutralization_method: Mapped[str]          = mapped_column(String(255), nullable=False)
    notes:                 Mapped[str | None]   = mapped_column(Text, nullable=True)
    submitted_by:          Mapped[int]          = mapped_column(ForeignKey("users.id"), nullable=False)
    submitted_at:          Mapped[datetime]     = mapped_column(DateTime(timezone=True), server_default=func.now())

    request:   Mapped["DeminingRequest"] = relationship("DeminingRequest", back_populates="completion_report")
    submitter: Mapped["User"]            = relationship("User", foreign_keys=[submitted_by])
