from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session
from app.schemas import (
    ChangePasswordRequest,
    MessageResponse,
    UpdateMeRequest,
    UserAdminActivityResponse,
    UserAdminActivityStatsResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.models import User
from app.services import UserService
from app.database import get_db
from app.enums import SystemUserRole
from app.routers.auth_router import clear_refresh_cookie
from app.utils.auth_dependencies import get_current_active_user, get_current_admin_user

user_router = APIRouter(
    prefix='/users',
    tags=['Users'],
)

def get_user_service(db: Session = Depends(get_db)):
    return UserService(db)


@user_router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def read_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@user_router.patch("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_me(
    payload: UpdateMeRequest,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.update_me(current_user, payload.username)


@user_router.patch("/me/password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def change_my_password(
    payload: ChangePasswordRequest,
    response: Response,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_active_user),
):
    service.change_password(current_user, payload.current_password, payload.new_password)
    clear_refresh_cookie(response)
    return MessageResponse(message="Password changed successfully.")


@user_router.get("/me/admin", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def read_me(current_user: User = Depends(get_current_admin_user)):
    return current_user


@user_router.get("/all", response_model=list[UserResponse], status_code=status.HTTP_200_OK)
def read_users(
    service: UserService = Depends(get_user_service), 
    current_user: User = Depends(get_current_admin_user)
):
    return service.get_all_users()


@user_router.get("/activity", response_model=list[UserAdminActivityResponse], status_code=status.HTTP_200_OK)
def read_users_with_activity(
    search: str | None = Query(default=None),
    role: SystemUserRole | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_admin_user),
):
    return service.get_all_users_with_activity(search=search, role=role, is_active=is_active)


@user_router.get("/activity/stats", response_model=UserAdminActivityStatsResponse, status_code=status.HTTP_200_OK)
def read_users_activity_stats(
    search: str | None = Query(default=None),
    role: SystemUserRole | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_admin_user),
):
    return service.get_users_activity_stats(search=search, role=role, is_active=is_active)


@user_router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate, 
    service: UserService = Depends(get_user_service)
):
    service.create_user(user_data)
    return MessageResponse(message="If an account with that email exists, an activation link has been sent.")


@user_router.get("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user = Depends(get_current_admin_user)
):
    return service.get_user(user_id)


@user_router.put("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_admin_user)
):
    return service.update_user(user_id, user_data, current_user.id)