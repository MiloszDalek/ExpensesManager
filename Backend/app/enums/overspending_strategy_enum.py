from enum import Enum


class OverspendingStrategy(str, Enum):
    ALLOW_NEGATIVE = "allow_negative"
    BLOCK = "block"
    AUTO_REALLOCATE = "auto_reallocate"
