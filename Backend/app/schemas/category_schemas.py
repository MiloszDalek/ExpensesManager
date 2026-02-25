from pydantic import BaseModel
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

    class Config:
        from_attributes = True