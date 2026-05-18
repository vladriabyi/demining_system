from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class UserRegister(BaseModel):
    email:     EmailStr
    full_name: str
    password:  str


class UserOut(BaseModel):
    id:          int
    email:       str
    full_name:   str
    role:        UserRole
    is_active:   bool
    is_verified: bool = False

    model_config = {"from_attributes": True}


class UserAdminUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str