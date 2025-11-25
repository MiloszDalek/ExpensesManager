from sqlalchemy.orm import Session
from fastapi import Depends
from datetime import datetime, timedelta, timezone
import jwt

from app.core.config import get_settings
from app.utils.auth_utils import verify_password, get_password_hash
from app.repositories import UserRepository
from app.models import User
from app.database import get_db

settings = get_settings()


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)


    def authenticate_user(self, email: str, password: str):
        user = self.user_repo.get_by_email(email)
        if not user:
            return False
        if not verify_password(password, user.hashed_password):
            return False
        return user


    def create_access_token(self, data: dict, expires_delta: timedelta | None = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expires_delta = datetime.now(timezone.utc) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt


    def create_refresh_token(self, data: dict, expires_delta: timedelta | None = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=7)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_REFRESH_SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt


    def create_admin(self):
        db = next(get_db())
        if not db.query(User).filter(User.role == "admin").first():
            admin = User(
                email="admin@gmail.com",
                username="Admin",            
                hashed_password=get_password_hash("password"),
                role="admin"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        db.close()


def get_auth_service(db: Session = Depends(get_db)):
    return AuthService(db)
