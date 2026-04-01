from pydantic import BaseModel, ConfigDict, EmailStr, Field, AliasPath
from datetime import datetime
from app.enums import InvitationStatus, InvitationType
from typing import Optional, Union


class ContactInvitationBase(BaseModel):
    to_user_id: int


class ContactInvitationCreate(BaseModel):
    to_user_id: Optional[int] = None
    to_user_email: Optional[EmailStr] = None


class ContactInvitationResponse(ContactInvitationBase):
    id: int
    type: InvitationType
    status: InvitationStatus
    from_user_id: int
    from_user_email: EmailStr = Field(validation_alias=AliasPath("from_user", "email"))
    from_user_username: str = Field(validation_alias=AliasPath("from_user", "username"))
    to_user_email: EmailStr = Field(validation_alias=AliasPath("to_user", "email"))
    to_user_username: str = Field(validation_alias=AliasPath("to_user", "username"))
    created_at: datetime
    responded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GroupInvitationCreate(ContactInvitationBase):
    group_id: int
    to_user_id: Optional[int] = None
    to_user_email: Optional[EmailStr] = None


class GroupInvitationResponse(ContactInvitationBase):
    id: int
    type: InvitationType
    status: InvitationStatus
    group_id: int
    group_name: Optional[str] = Field(default=None, validation_alias=AliasPath("group", "name"))
    from_user_id: int
    from_user_email: EmailStr = Field(validation_alias=AliasPath("from_user", "email"))
    from_user_username: str = Field(validation_alias=AliasPath("from_user", "username"))
    to_user_email: EmailStr = Field(validation_alias=AliasPath("to_user", "email"))
    to_user_username: str = Field(validation_alias=AliasPath("to_user", "username"))
    created_at: datetime
    responded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


InvitationResponse = Union[ContactInvitationResponse, GroupInvitationResponse]