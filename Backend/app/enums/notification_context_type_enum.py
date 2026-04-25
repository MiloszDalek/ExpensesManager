from enum import Enum


class NotificationContextType(str, Enum):
    BUDGET = "budget"
    EXPENSE = "expense"
    GROUP = "group"
    SETTLEMENT = "settlement"
    GOAL = "goal"
    RECURRING = "recurring"
    INVITATION = "invitation"
