from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "Expenses Manager"
    DATABASE_URL: str
    FRONTEND_URL: str
    JWT_SECRET_KEY: str
    ALGORITHM: str

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()