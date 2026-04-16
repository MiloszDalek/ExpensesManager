from enum import Enum


class BudgetAllocationStrategy(str, Enum):
    FIXED = "fixed"
    PERCENT_INCOME = "percent_income"
    ZERO_BASED = "zero_based"
