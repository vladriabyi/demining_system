import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.schemas.user import UserRegister, LoginRequest, TokenResponse
from app.models.user import User, UserRole
from app.core.security import verify_password, hash_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email вже зареєстровано")

    token = secrets.token_urlsafe(32)
    new_user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=UserRole.civilian,
        is_active=True,
        is_verified=False,
        verification_token=token,
    )
    db.add(new_user)
    await db.commit()

    # Відправляємо лист підтвердження
    from app.core.email import send_verification_email
    try:
        await send_verification_email(data.email, data.full_name, token)
    except Exception:
        pass

    return {"message": "Реєстрація успішна! Перевірте вашу пошту для підтвердження акаунта."}


@router.post("/verify-email", response_model=TokenResponse)
async def verify_email(payload: dict, db: AsyncSession = Depends(get_db)):
    token = payload.get("token", "")
    if not token:
        raise HTTPException(400, "Токен не вказано")

    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(400, "Невірний або застарілий токен підтвердження")

    user.is_verified = True
    user.verification_token = None
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=access_token, user=user)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
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
