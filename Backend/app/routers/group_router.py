from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.services import GroupService
from app.database import get_db
from app.schemas import GroupResponse, GroupCreate, GroupUpdate, UserResponse, GroupMemberResponse
from app.models import User
from app.utils.auth_dependencies import get_current_active_user, get_current_admin_user

group_router = APIRouter(
    prefix='/groups',
    tags=['Groups'],
)

def get_group_service(db: Session = Depends(get_db)):
    return GroupService(db)


@group_router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_in: GroupCreate,
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.create_group(group_in, current_user.id)


@group_router.get("/all", response_model=list[GroupResponse])
def get_all_groups(
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_all_groups(current_user.id)


@group_router.get("/{group_id}", response_model=GroupResponse)
def get_group_by_id(
    group_id: int,
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_group(group_id, current_user.id)


@group_router.get("/{group_id}/members", response_model=list[GroupMemberResponse])
def get_group_members(
    group_id: int,
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_all_members(group_id, current_user.id)


@group_router.patch("/{group_id}/members/{user_id}/grant-admin", response_model=GroupMemberResponse)
def grant_admin_role(
    group_id: int,
    user_id: int,
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.grant_admin_role(group_id, user_id, current_user.id)