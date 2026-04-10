from enum import Enum


class BudgetPoolType(str, Enum):
    FIXED_AMOUNT = "fixed_amount"
    PERCENT_INCOME = "percent_income"
