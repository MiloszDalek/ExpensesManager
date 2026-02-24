from pydantic import BaseModel
from typing import Optional


class ExpenseShareBase(BaseModel):
    expense_id: int
    user_id: int
    share_amount: float
    is_paid: bool = False
    currency: str = "PLN"


class ExpenseShareCreate(ExpenseShareBase):
    pass


class ExpenseShareUpdate(BaseModel):
    share_amount: Optional[float] = None
    is_paid: Optional[bool] = None
    currency: Optional[str] = None
    

class ExpenseShareResponse(ExpenseShareBase):
    id: int
    
    class Config:
        from_attributes = True