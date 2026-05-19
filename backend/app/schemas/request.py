from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.request import RequestStatus, Priority, ExplosiveType
from app.schemas.user import UserOut
from app.schemas.report import ReportOut  # пряме підключення — кругового імпорту немає


class RequestCreate(BaseModel):
    title:          str
    description:    Optional[str]         = None
    priority:       Priority              = Priority.medium
    explosive_type: ExplosiveType         = ExplosiveType.unknown
    location_name:  str
    latitude:       float
    longitude:      float
    phone:          Optional[str]         = None

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (44.0 <= v <= 53.0):
            raise ValueError(f"Широта {v} виходить за межі України (44°–53° пн.ш.).")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (22.0 <= v <= 40.0):
            raise ValueError(f"Довгота {v} виходить за межі України (22°–40° сх.д.).")
        return v


class RequestUpdate(BaseModel):
    title:          Optional[str]           = None
    description:    Optional[str]           = None
    status:         Optional[RequestStatus] = None
    priority:       Optional[Priority]      = None
    explosive_type: Optional[ExplosiveType] = None
    assigned_to_id: Optional[int]           = None
    brigade_id:     Optional[int]           = None
    comment:        Optional[str]           = None


class StatusHistoryOut(BaseModel):
    id:         int
    old_status: str
    new_status: str
    changed_by: int
    comment:    Optional[str]
    changed_at: datetime
    changer:    Optional[UserOut] = Field(default=None, validation_alias="changed_by_user")

    model_config = {"from_attributes": True, "populate_by_name": True}


class NearbyRequestOut(BaseModel):
    id:            int
    title:         str
    status:        RequestStatus
    distance_m:    float
    latitude:      float
    longitude:     float
    location_name: str

    model_config = {"from_attributes": True}


class RequestOut(BaseModel):
    id:                 int
    title:              str
    description:        Optional[str]
    status:             RequestStatus
    priority:           Priority
    explosive_type:     ExplosiveType
    location_name:      str
    latitude:           float
    longitude:          float
    photo_path:         Optional[str]                    = None
    requester_id:       int
    assigned_to_id:     Optional[int]
    brigade_id:         Optional[int]                    = None
    created_at:         datetime
    updated_at:         datetime
    phone:              Optional[str]                    = None
    requester:          Optional[UserOut]                = None
    assignee:           Optional[UserOut]                = None
    status_history:     Optional[List[StatusHistoryOut]] = None
    completion_report:  Optional[ReportOut]              = None

    model_config = {"from_attributes": True}


class DashboardStatsOut(BaseModel):
    total_requests:       int
    pending_requests:     int
    in_progress_requests: int
    completed_requests:   int
    critical_requests:    int
    total_brigades:       int  # замінено total_territories → total_brigades
