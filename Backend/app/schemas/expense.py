from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ExpenseBase(BaseModel):
    title: str
    amount: float
    group_id: int
    payer_id: int


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None


class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True