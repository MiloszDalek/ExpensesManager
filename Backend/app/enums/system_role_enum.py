from enum import Enum


class SystemUserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
