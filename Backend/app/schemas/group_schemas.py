from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.enums import GroupStatus, CurrencyEnum


class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    currency: CurrencyEnum


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[GroupStatus] = None
    currency: Optional[CurrencyEnum] = None


class GroupResponse(GroupBase):
    id: int
    status: GroupStatus
    created_by: int
    created_at: datetime
    members_count: int = 0
    expenses_count: int = 0
    total_amount: Decimal = Decimal("0")
    
    model_config = ConfigDict(from_attributes=True)

