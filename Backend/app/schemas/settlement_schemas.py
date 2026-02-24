from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SettlementBase(BaseModel):
    from_user_id: int
    to_user_id: int
    amount: float
    currency: str = "PLN"
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None


class SettlementCreate(SettlementBase):
    pass


class SettlementResponse(SettlementBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True