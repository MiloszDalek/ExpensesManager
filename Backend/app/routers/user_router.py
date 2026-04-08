from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.schemas import (
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


@user_router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate, 
    service: UserService = Depends(get_user_service)
):
    return service.create_user(user_data)


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