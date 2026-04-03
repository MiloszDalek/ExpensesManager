from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.enums import SettlementStatus, CurrencyEnum, PaymentMethod


class SettlementCreate(BaseModel):
    to_user_id: int
    group_id: Optional[int] = None
    transaction_id: Optional[str] = None


class PayPalSettlementInitiateCreate(BaseModel):
    to_user_id: int
    group_id: int


class PayPalSettlementInitiateResponse(BaseModel):
    settlement_id: int
    order_id: str
    approve_url: str
    status: SettlementStatus


class PayPalTotalSettlementInitiateCreate(BaseModel):
    to_user_id: int


class PayPalTotalSettlementInitiateResponse(BaseModel):
    settlement_ids: list[int]
    order_id: str
    approve_url: str
    status: SettlementStatus


class PayPalSettlementFinalizeRequest(BaseModel):
    order_id: str


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
    paypal_order_id: Optional[str] = None
    paypal_capture_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)