from enum import Enum


class GroupMemberRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"