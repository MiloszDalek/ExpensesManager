from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.enums import GroupMemberRole, GroupMemberStatus


class GroupMemberBase(BaseModel):
    group_id: int
    user_id: int


class GroupMemberResponse(GroupMemberBase):
    id: int
    joined_at: datetime
    role: GroupMemberRole
    status: GroupMemberStatus

    model_config = ConfigDict(from_attributes=True)