from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    user_id: Optional[int] = None
    group_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)