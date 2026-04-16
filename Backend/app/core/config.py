from pydantic_settings import BaseSettings
from functools import lru_cache

from app.enums import OverspendingStrategy

class Settings(BaseSettings):
    APP_NAME: str = "Expenses Manager"
    DATABASE_URL: str
    FRONTEND_URL: str
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    ALGORITHM: str
    PAYPAL_ENABLED: bool = False
    PAYPAL_MODE: str = "sandbox"
    PAYPAL_CLIENT_ID: str | None = None
    PAYPAL_CLIENT_SECRET: str | None = None
    PAYPAL_WEBHOOK_ID: str | None = None
    PAYPAL_RETURN_URL: str | None = None
    PAYPAL_CANCEL_URL: str | None = None
    RECEIPT_OCR_ENGINE: str = "auto"
    RECEIPT_OCR_PADDLE_LANG: str = "en"
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK: bool = True
    BUDGET_OVERSPENDING_STRATEGY: OverspendingStrategy = OverspendingStrategy.ALLOW_NEGATIVE
    BUDGET_NOTIFICATION_THRESHOLD_PERCENT: float = 80.0
    BUDGET_ROLLOVER_SCHEDULER_ENABLED: bool = True
    BUDGET_ROLLOVER_SCHEDULER_INTERVAL_SECONDS: int = 3600

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()