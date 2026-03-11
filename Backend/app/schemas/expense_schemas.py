from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.enums import CurrencyEnum, SplitType


class ExpenseBase(BaseModel):
    title: str
    amount: Decimal
    currency: CurrencyEnum = CurrencyEnum.PLN
    expense_date: datetime
    category_id: int  
    notes: Optional[str] = None
    receipt_image_url: Optional[str] = None
    receipt_text: Optional[str] = None


class PersonalExpenseCreate(ExpenseBase):
    pass


class PersonalExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[CurrencyEnum] = None
    expense_date: Optional[datetime] = None
    category_id: Optional[int] = None
    receipt_image_url: Optional[str] = None
    receipt_text: Optional[str] = None


class PersonalExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ExpenseShareSchema(BaseModel):
    user_id: int
    share_amount: Decimal


class GroupExpenseBase(ExpenseBase):
    split_type: SplitType
    shares: list[ExpenseShareSchema]


class GroupExpenseCreate(GroupExpenseBase):
    pass


class GroupExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[CurrencyEnum] = None
    expense_date: Optional[datetime] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None
    split_type: Optional[SplitType] = None
    shares: Optional[list[ExpenseShareSchema]] = None


class GroupExpenseResponse(GroupExpenseBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)