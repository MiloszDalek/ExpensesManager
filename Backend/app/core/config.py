from pydantic_settings import BaseSettings
from functools import lru_cache

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

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()