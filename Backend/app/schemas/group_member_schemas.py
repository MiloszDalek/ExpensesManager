from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, AliasPath, EmailStr
from app.enums import GroupMemberRole, GroupMemberStatus


class GroupMemberBase(BaseModel):
    group_id: int
    user_id: int


class GroupMemberResponse(GroupMemberBase):
    id: int
    joined_at: datetime
    role: GroupMemberRole
    status: GroupMemberStatus
    email: EmailStr = Field(validation_alias=AliasPath("user", "email"))
    username: str = Field(validation_alias=AliasPath("user", "username"))

    model_config = ConfigDict(from_attributes=True)