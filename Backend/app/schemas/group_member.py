from pydantic import BaseModel


class GroupMemberBase(BaseModel):
    group_id: int
    user_id: int


class GroupMemberResponse(GroupMemberBase):
    id: int
    class Config:
        from_attributes = True