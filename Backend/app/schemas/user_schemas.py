from datetime import datetime
import re
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional
from app.enums import SystemUserRole


PASSWORD_MIN_LENGTH = 8
PASSWORD_ERROR_MESSAGE = (
    f"Password must be at least {PASSWORD_MIN_LENGTH} characters long and include at least one letter and one digit."
)
PASSWORD_LETTER_REGEX = re.compile(r"[A-Za-z]")
PASSWORD_DIGIT_REGEX = re.compile(r"\d")


def _validate_password_complexity(password: str) -> str:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(PASSWORD_ERROR_MESSAGE)

    if not PASSWORD_LETTER_REGEX.search(password):
        raise ValueError(PASSWORD_ERROR_MESSAGE)

    if not PASSWORD_DIGIT_REGEX.search(password):
        raise ValueError(PASSWORD_ERROR_MESSAGE)

    return password


class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_complexity(value)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return _validate_password_complexity(value)


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
