from enum import Enum


class PaymentMethod(str, Enum):
    CASH = "cash"
    PAYPAL = "paypal"
    OFFSET_APPLIED = "offset_applied"
    OFFSET_FORGIVEN = "offset_forgiven"