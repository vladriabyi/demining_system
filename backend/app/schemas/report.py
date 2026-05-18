from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.user import UserOut


class ReportCreate(BaseModel):
    explosive_type_found:  str
    quantity:              int              = 1
    area_cleared_m2:       Optional[float] = None
    time_spent_hours:      Optional[float] = None
    neutralization_method: str
    notes:                 Optional[str]   = None


class ReportOut(BaseModel):
    id:                    int
    request_id:            int
    explosive_type_found:  str
    quantity:              int
    area_cleared_m2:       Optional[float]
    time_spent_hours:      Optional[float]
    neutralization_method: str
    notes:                 Optional[str]
    submitted_by:          int
    submitted_at:          datetime
    submitter:             Optional[UserOut] = None

    model_config = {"from_attributes": True}
