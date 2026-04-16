from enum import Enum


class NotificationType(str, Enum):
    INVITATION = "invitation"
    BUDGET_NEAR_LIMIT = "budget_near_limit"
    BUDGET_OVERSPENDING = "budget_overspending"
    UPCOMING_RECURRING_EXPENSE = "upcoming_recurring_expense"