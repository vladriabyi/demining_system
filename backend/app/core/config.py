from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL:               str
    SECRET_KEY:                 str
    ALGORITHM:                  str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Telegram
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID:   Optional[str] = None

    # Email (SMTP)
    SMTP_HOST:     str = ""
    SMTP_PORT:     int = 587
    SMTP_USER:     str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM:     str = ""
    SMTP_TLS:      bool = True

    # Frontend URL (для посилань у листах)
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
