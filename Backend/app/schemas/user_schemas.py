from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from app.enums import SystemUserRole


class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    role: SystemUserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserAdminActivityResponse(UserResponse):
    groups_count: int
    expenses_count: int
    sent_invitations_count: int
    settlements_count: int
    last_activity_at: Optional[datetime] = None


class UserAdminActivityStatsResponse(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
