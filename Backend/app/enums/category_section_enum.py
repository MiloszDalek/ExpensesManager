from enum import Enum


class CategorySection(str, Enum):
    FOOD = "food"
    TRANSPORT = "transport"
    HOME = "home"
    BILLS = "bills"
    LIFESTYLE = "lifestyle"
    HEALTH = "health"
    FINANCE = "finance"
    EDUCATION = "education"
    FAMILY = "family"
    OTHER = "other"
