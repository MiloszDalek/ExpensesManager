from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.enums import SettlementStatus, CurrencyEnum, PaymentMethod


class SettlementBase(BaseModel):
    to_user_id: int
    group_id: Optional[int] = None
    currency: CurrencyEnum = CurrencyEnum.PLN
    payment_method: PaymentMethod = PaymentMethod.CASH
    transaction_id: Optional[str] = None


class SettlementCreate(SettlementBase):
    pass


class SettlementResponse(SettlementBase):
    id: int
    status: SettlementStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)