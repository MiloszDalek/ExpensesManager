from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user_schemas import _validate_password_complexity


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    language: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return _validate_password_complexity(value)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return _validate_password_complexity(value)


class UpdateMeRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=255)


class MessageResponse(BaseModel):
    message: str
