from enum import Enum


class BudgetStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
