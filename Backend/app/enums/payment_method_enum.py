from enum import Enum


class PaymentMethod(str, Enum):
    CASH = "cash"
    OFFSET_APPLIED = "offset_applied"
    OFFSET_FORGIVEN = "offset_forgiven"