from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.schemas import UserCreate, UserResponse, UserUpdate
from app.models import User
from app.services import UserService
from app.database import get_db
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


@user_router.get("/", response_model=list[UserResponse], status_code=status.HTTP_200_OK)
def read_users(service: UserService = Depends(get_user_service), current_user: User = Depends(get_current_active_user)):
    return service.get_all_users()


@user_router.get("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_user(user_id: int, service: UserService = Depends(get_user_service)):
    return service.get_user(user_id)


@user_router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, service: UserService = Depends(get_user_service)):
    return service.create_user(user_data)


@user_router.put("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def update_user(user_id: int, user_data: UserUpdate, service: UserService = Depends(get_user_service)):
    return service.update_user(user_id, user_data)


@user_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_user(user_id: int, service: UserService = Depends(get_user_service)):
    service.delete_user(user_id)