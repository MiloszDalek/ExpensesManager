from enum import Enum


class NotificationSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    URGENT = "urgent"