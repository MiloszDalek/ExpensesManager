from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.services import GroupService
from app.database import get_db
from app.schemas import GroupResponse, GroupCreate, GroupUpdate, UserResponse
from app.models import User
from Backend.app.utils.auth_dependencies import get_current_active_user, get_current_admin_user

group_router = APIRouter(
    prefix='/groups',
    tags=['Groups'],
)

def get_group_service(db: Session = Depends(get_db)):
    return GroupService(db)


@group_router.get("/", response_model=list[GroupResponse])
def list_groups(
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.list_user_groups(current_user.id)


@group_router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_data: GroupCreate, 
    service: GroupService = Depends(get_group_service), 
    current_user: User = Depends(get_current_active_user)
):
    return service.create_group(group_data, current_user.id)


@group_router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: int, 
    service: GroupService = Depends(get_group_service), 
    current_user: User = Depends(get_current_active_user)
):
    return service.get_group(group_id)


@group_router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int, 
    group_data: GroupUpdate, 
    service: GroupService = Depends(get_group_service), 
    current_user: User = Depends(get_current_active_user)
):
    return service.update_group(group_id, group_data)


@group_router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int, 
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    service.delete_group(group_id)
    return None


@group_router.post("/{group_id}/members/{member_id}", status_code=status.HTTP_201_CREATED)
def add_member_to_group(
    group_id: int,
    member_id: int,
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    service.add_member(group_id, member_id)


@group_router.delete("/{group_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member_from_group(
    group_id: int,
    member_id: int,
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    service.remove_member(group_id, member_id)


@group_router.get("/{group_id}/members", response_model=list[UserResponse])
def list_group_members(
    group_id: int,
    service: GroupService = Depends(get_group_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_members(group_id)