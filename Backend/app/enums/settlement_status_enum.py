from enum import Enum


class SettlementStatus(str, Enum):
    PENDING = "pending"
    PENDING_PAYPAL = "pending_paypal"
    COMPLETED = "completed"
    FAILED = "failed"
    