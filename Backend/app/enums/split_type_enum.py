from enum import Enum


class SplitType(str, Enum):
    EQUAL = "equal"
    PERCENT = "percent"
    EXACT = "exact"