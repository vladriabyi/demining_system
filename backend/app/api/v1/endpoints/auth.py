import secrets
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.schemas.user import UserRegister, LoginRequest, TokenResponse
from app.models.user import User, UserRole
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    hash_verification_token,
)
from app.core.email import send_verification_email, send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])


class VerifyTokenRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


def _is_expired(expires_at: datetime | None) -> bool:
    if expires_at is None:
        return True
    expires = expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires < datetime.now(timezone.utc)


def _verification_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=settings.VERIFICATION_TOKEN_EXPIRE_MINUTES)


def _password_reset_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)


async def _issue_verification_email(user: User, db: AsyncSession) -> None:
    plain_token = secrets.token_urlsafe(32)
    user.verification_token = hash_verification_token(plain_token)
    user.verification_token_expires_at = _verification_expires_at()
    await db.commit()
    try:
        await send_verification_email(user.email, user.full_name, plain_token)
    except Exception:
        pass


async def _issue_password_reset_email(user: User, db: AsyncSession) -> None:
    plain_token = secrets.token_urlsafe(32)
    user.password_reset_token = hash_verification_token(plain_token)
    user.password_reset_expires_at = _password_reset_expires_at()
    await db.commit()
    try:
        await send_password_reset_email(user.email, user.full_name, plain_token)
    except Exception:
        pass


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email вже зареєстровано")

    new_user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=UserRole.civilian,
        is_active=True,
        is_verified=False,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await _issue_verification_email(new_user, db)

    return {"message": "Реєстрація успішна! Перевірте вашу пошту для підтвердження акаунта."}


@router.post("/verify-email", response_model=TokenResponse)
@limiter.limit("10/minute")
async def verify_email(
    request: Request,
    data: VerifyTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    if not data.token:
        raise HTTPException(400, "Токен не вказано")

    token_hash = hash_verification_token(data.token)
    result = await db.execute(select(User).where(User.verification_token == token_hash))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(400, "Невірний або застарілий токен підтвердження")

    if _is_expired(user.verification_token_expires_at):
        user.verification_token = None
        user.verification_token_expires_at = None
        await db.commit()
        raise HTTPException(400, "Термін дії посилання закінчився. Запросіть новий лист підтвердження.")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=access_token, user=user)


@router.post("/resend-verification", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("3/minute")
async def resend_verification(
    request: Request,
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user and not user.is_verified and user.is_active:
        await _issue_verification_email(user, db)

    return {"message": "Запит прийнято. Перевірте пошту — лист із підтвердженням надійде протягом кількох хвилин."}


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        await _issue_password_reset_email(user, db)

    return {"message": "Запит прийнято. Перевірте пошту — лист із посиланням для скидання пароля надійде протягом кількох хвилин."}


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    if not data.token:
        raise HTTPException(400, "Токен не вказано")

    token_hash = hash_verification_token(data.token)
    result = await db.execute(select(User).where(User.password_reset_token == token_hash))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(400, "Невірний або застарілий токен скидання пароля")

    if _is_expired(user.password_reset_expires_at):
        user.password_reset_token = None
        user.password_reset_expires_at = None
        await db.commit()
        raise HTTPException(400, "Термін дії посилання закінчився. Запросіть новий лист.")

    user.hashed_password = hash_password(data.password)
    user.password_reset_token = None
    user.password_reset_expires_at = None
    await db.commit()

    return {"message": "Пароль успішно змінено. Тепер можете увійти."}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Невірний email або пароль")

    if not user.is_active:
        raise HTTPException(403, "Акаунт деактивовано")

    if not user.is_verified:
        raise HTTPException(403, "Будь ласка, підтвердіть вашу електронну пошту. Перевірте inbox.")

    access_token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=access_token, user=user)
