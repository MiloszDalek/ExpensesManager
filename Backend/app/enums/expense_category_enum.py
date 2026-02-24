from enum import Enum

class DefaultExpenseCategory(str, Enum):
    FOOD = "food"
    TRANSPORT = "transport"
    ACCOMODATION = "accommodation"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    UTILITIES = "utilities"
    HEALTH = "health"
    GROCERIES = "groceries"
    OTHER = "other"
