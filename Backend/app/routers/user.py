from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas import UserCreate, UserResponse, UserUpdate
from app.models import User
from app.services import (
    get_user_by_email,
    get_user_by_id,
    get_all_users,
    create_user,
    update_user,
    delete_user,
    get_current_active_user,
    get_current_admin_user
)
from app.database import get_db

user_router = APIRouter(
    prefix='/users',
    tags=['Users'],
)


@user_router.get("/me")
async def read_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@user_router.get("/", response_model=list[UserResponse])
def read_users(db: Session = Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    users = get_all_users(db)
    return users


@user_router.get("/{user_id}", response_model=UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@user_router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db, user_data)


@user_router.put("/{user_id}", response_model=UserResponse)
def update_existing_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    user = update_user(db, user_id, user_update.dict(exclude_unset=True))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@user_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_user(user_id: int, db: Session = Depends(get_db)):
    success = delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return None