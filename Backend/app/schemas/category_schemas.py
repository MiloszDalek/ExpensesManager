from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.enums import CategorySection


class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    section: CategorySection


class CategoryResponse(CategoryBase):
    id: int
    section: CategorySection
    user_id: Optional[int] = None
    group_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)