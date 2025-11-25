from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from typing import Annotated
from jwt.exceptions import InvalidTokenError
import jwt

from app.core.config import get_settings
from app.schemas import TokenData
from app.repositories import UserRepository
from app.models import User
from app.database import get_db

settings = get_settings()

OAuth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")


async def get_current_user(token: Annotated[str, Depends(OAuth2_scheme)], db: Session = Depends(get_db)): 
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
    user_repo = UserRepository(db)
    user = user_repo.get_by_email(email=token_data.email)
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


