from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.enums import SettlementStatus, CurrencyEnum, PaymentMethod


class SettlementCreate(BaseModel):
    to_user_id: int
    group_id: Optional[int] = None
    transaction_id: Optional[str] = None


class SettlementResponse(BaseModel):
    id: int
    from_user_id: int
    to_user_id: int
    group_id: int
    amount: Decimal
    currency: CurrencyEnum
    payment_method: PaymentMethod
    status: SettlementStatus
    transaction_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)