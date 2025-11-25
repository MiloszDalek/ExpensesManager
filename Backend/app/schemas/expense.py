from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ExpenseBase(BaseModel):
    title: str
    amount: float
    payer_id: int
    group_id: Optional[int] = None
    is_personal: bool = True
    currency: str = "PLN"
    category: Optional[str] = None
    receipt_image_url: Optional[str] = None
    receipt_text: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    group_id: Optional[int] = None
    is_personal: Optional[bool] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    receipt_image_url: Optional[str] = None
    receipt_text: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True