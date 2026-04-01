from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.services import GroupService
from app.database import get_db
from app.schemas import GroupResponse, GroupCreate, GroupUpdate, GroupMemberResponse
from app.models import User
from app.utils.auth_dependencies import get_current_active_user

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


@group_router.patch("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int,
    group_in: GroupUpdate,
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.update_group(group_id, group_in, current_user.id)


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


@group_router.delete("/{group_id}/members/me", status_code=status.HTTP_204_NO_CONTENT)
def leave_group(
    group_id: int,
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    service.leave_group(group_id, current_user.id)


@group_router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    group_id: int,
    user_id: int,
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    service.remove_member(group_id, user_id, current_user.id)