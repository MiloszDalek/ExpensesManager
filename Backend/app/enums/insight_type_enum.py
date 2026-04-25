from enum import Enum


class InsightType(str, Enum):
    BUDGET_WARNING = "budget_warning"
    BUDGET_EXCEEDED = "budget_exceeded"
    SPENDING_SPIKE = "spending_spike"
    HIGH_CATEGORY_USAGE = "high_category_usage"
    LOW_SAVINGS_RATE = "low_savings_rate"
    UPCOMING_PAYMENT = "upcoming_payment"
    GROUP_DEBT = "group_debt"
