from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from datetime import datetime, timedelta, timezone
import hashlib
import logging
import secrets
import jwt

from app.core.config import get_settings
from app.utils.auth_utils import verify_password, get_password_hash
from app.utils.email_utils import send_password_reset_email
from app.repositories import UserRepository, PasswordResetTokenRepository
from app.models import User
from app.database import get_db
from app.enums import SystemUserRole

logger = logging.getLogger(__name__)

settings = get_settings()


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.reset_token_repo = PasswordResetTokenRepository(db)


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
        admins = (
            self.db.query(User)
            .filter(User.role == SystemUserRole.ADMIN)
            .order_by(User.created_at.asc(), User.id.asc())
            .all()
        )

        if not admins:
            admin = User(
                email=settings.ADMIN_EMAIL,
                username=settings.ADMIN_USERNAME,            
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role=SystemUserRole.ADMIN,
                is_active=True,
            )
            self.db.add(admin)
            self.db.commit()
            self.db.refresh(admin)
            return

        primary_admin = admins[0]
        changed = False

        if not primary_admin.is_active:
            primary_admin.is_active = True
            changed = True

        for extra_admin in admins[1:]:
            extra_admin.role = SystemUserRole.USER
            changed = True

        if changed:
            self.db.commit()


    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()


    @staticmethod
    def _build_reset_link(raw_token: str) -> str:
        frontend_origins = [
            origin.strip().rstrip("/")
            for origin in settings.FRONTEND_URL.split(",")
            if origin.strip()
        ]
        base = frontend_origins[0] if frontend_origins else ""
        path = settings.PASSWORD_RESET_PATH
        if not path.startswith("/"):
            path = "/" + path
        return f"{base}{path}?token={raw_token}"


    def request_password_reset(self, email: str) -> None:
        """
        Anti-enumeration: never raise based on existence/state of the user.
        Caller must always return a generic 200 response.
        """
        user = self.user_repo.get_by_email(email)
        if not user or not user.is_active:
            return

        self.reset_token_repo.invalidate_active_for_user(user.id)

        raw_token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.PASSWORD_RESET_TOKEN_TTL_MINUTES
        )
        self.reset_token_repo.create(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        reset_link = self._build_reset_link(raw_token)
        try:
            send_password_reset_email(user.email, reset_link)
        except Exception:
            # Email failure is logged in email_utils. Do not leak details to caller.
            logger.error("Password reset email could not be delivered to user_id=%s", user.id)


    def reset_password(self, token: str, new_password: str) -> User:
        token_hash = self._hash_token(token)
        record = self.reset_token_repo.get_active_by_hash(token_hash)
        if not record:
            raise HTTPException(status_code=400, detail="Invalid or expired token")

        user = self.user_repo.get_by_id(record.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=400, detail="Invalid or expired token")

        user.hashed_password = get_password_hash(new_password)
        self.user_repo.create(user)

        self.reset_token_repo.mark_used(record)
        self.reset_token_repo.invalidate_active_for_user(user.id)
        return user


def get_auth_service(db: Session = Depends(get_db)):
    return AuthService(db)
