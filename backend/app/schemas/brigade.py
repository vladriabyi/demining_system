from pydantic import BaseModel
from typing import Optional, List
from app.models.brigade import BrigadeStatus
from app.schemas.user import UserOut


class BrigadeCreate(BaseModel):
    name:           str
    number:         str
    status:         BrigadeStatus = BrigadeStatus.available
    specialization: Optional[str] = None
    member_ids:     List[int]     = []


class BrigadeUpdate(BaseModel):
    name:           Optional[str]           = None
    number:         Optional[str]           = None
    status:         Optional[BrigadeStatus] = None
    specialization: Optional[str]           = None
    member_ids:     Optional[List[int]]     = None


class BrigadeOut(BaseModel):
    id:             int
    name:           str
    number:         str
    status:         BrigadeStatus
    specialization: Optional[str]
    members:        List[UserOut] = []

    model_config = {"from_attributes": True}
