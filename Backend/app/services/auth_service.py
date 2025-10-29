from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from datetime import datetime, timedelta, timezone
from typing import Annotated
from jwt.exceptions import InvalidTokenError
import jwt

from app.core.config import get_settings
from app.utils.auth_utils import verify_password, get_password_hash
from app.schemas import TokenData
from app.services import get_user_by_email
from app.models import User
from app.database import get_db

settings = get_settings()

OAuth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")


def authenticate_user(email: str, password: str, db: Session = Depends(get_db)):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expires_delta = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(token: Annotated[str, Depends(OAuth2_scheme)], db:Session = Depends(get_db)): 
    credentials_exception= HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms = [settings.ALGORITHM]) 
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except (InvalidTokenError, jwt.ExpiredSignatureError, jwt.PyJWTError):
        raise credentials_exception
    user = get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
       raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_admin_user(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


def create_admin():
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