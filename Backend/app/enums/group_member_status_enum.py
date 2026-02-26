from enum import Enum


class GroupMemberStatus(str, Enum):
    ACTIVE = "active"
    PENDING = "pending"
    LEFT = "left"
    REJECTED = "rejected"