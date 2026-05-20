from enum import Enum


class NotificationType(str, Enum):
    INVITATION_RECEIVED = "invitation_received"
    INVITATION_ACCEPTED = "invitation_accepted"
    INVITATION_REJECTED = "invitation_rejected"
    
    BUDGET_NEAR_LIMIT = "budget_near_limit"
    BUDGET_EXCEEDED = "budget_exceeded"
    BUDGET_RESET = "budget_reset"
    
    NEW_EXPENSE_ADDED = "new_expense_added"
    EXPENSE_UPDATED = "expense_updated"
    EXPENSE_DELETED = "expense_deleted"
    
    RECURRING_DUE_SOON = "recurring_due_soon"
    RECURRING_EXECUTED = "recurring_executed"
    RECURRING_FAILED = "recurring_failed"
    
    SETTLEMENT_PENDING = "settlement_pending"
    SETTLEMENT_COMPLETED = "settlement_completed"
    SETTLEMENT_FAILED = "settlement_failed"
    
    GOAL_PROGRESS = "goal_progress"
    GOAL_COMPLETED = "goal_completed"
    
    UNUSUAL_SPENDING = "unusual_spending"
    HIGH_SPENDING_CATEGORY = "high_spending_category"
    
    INVITATION = "invitation"
    BUDGET_OVERSPENDING = "budget_overspending"
    UPCOMING_RECURRING_EXPENSE = "upcoming_recurring_expense"