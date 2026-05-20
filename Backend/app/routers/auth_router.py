from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
import jwt
from app.schemas import (
    Token,
    ActivateAccountRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResendActivationRequest,
    MessageResponse,
)
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated
from datetime import timedelta
from app.services import AuthService
from app.repositories import UserRepository
from app.database import get_db
from app.core.config import get_settings


auth_router = APIRouter(
    prefix='/auth',
    tags=['Auth'],
)

settings = get_settings()


def _parse_frontend_origins(frontend_url: str) -> list[str]:
    return [origin.strip().rstrip("/") for origin in frontend_url.split(",") if origin.strip()]


def _should_use_secure_cookie(frontend_url: str) -> bool:
    return any(origin.lower().startswith("https://") for origin in _parse_frontend_origins(frontend_url))


def clear_refresh_cookie(response: Response) -> None:
    """Clear the HttpOnly refresh_token cookie. Shared across routers."""
    secure_cookie = _should_use_secure_cookie(settings.FRONTEND_URL)
    same_site_policy = "none" if secure_cookie else "lax"
    response.delete_cookie(
        key="refresh_token",
        path="/",
        secure=secure_cookie,
        samesite=same_site_policy,
        httponly=True,
    )

@auth_router.post('/token')
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    response: Response,
    db: Session = Depends(get_db)
) -> Token:
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account not activated",
        )
    
    access_token_expires = timedelta(minutes=15)
    refresh_token_expires = timedelta(days=7)
    secure_cookie = _should_use_secure_cookie(settings.FRONTEND_URL)
    same_site_policy = "none" if secure_cookie else "lax"

    access_token = auth_service.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    refresh_token = auth_service.create_refresh_token(
        data={"sub": user.email}, expires_delta=refresh_token_expires
    )

    #  refresh token in HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure_cookie,
        samesite=same_site_policy,
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

    return Token(access_token=access_token, token_type="bearer")
    

@auth_router.post("/refresh")
async def refresh_access_token(
    response: Response,
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_db)
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    
    try:
        payload = jwt.decode(refresh_token, settings.JWT_REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_repo = UserRepository(db)
    user = user_repo.get_by_email(email)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access_token_expires = timedelta(minutes=15)
    access_token = AuthService(db).create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return Token(access_token=access_token, token_type="bearer")


@auth_router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    auth_service.request_password_reset(payload.email, language=payload.language)
    return MessageResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )


@auth_router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    auth_service.reset_password(payload.token, payload.new_password)
    clear_refresh_cookie(response)
    return MessageResponse(message="Password has been reset successfully.")


@auth_router.post("/activate-account", response_model=MessageResponse)
async def activate_account(
    payload: ActivateAccountRequest,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    auth_service.activate_account(payload.token)
    return MessageResponse(message="Account has been activated successfully.")


@auth_router.post("/resend-activation", response_model=MessageResponse)
async def resend_activation(
    payload: ResendActivationRequest,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    auth_service.request_account_activation(payload.email, language=payload.language)
    return MessageResponse(message="If an account with that email exists, an activation link has been sent.")