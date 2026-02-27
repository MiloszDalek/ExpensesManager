from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.enums import GroupStatus


class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class GroupResponse(GroupBase):
    id: int
    status: GroupStatus
    created_by: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

