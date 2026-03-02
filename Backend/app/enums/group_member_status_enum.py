from enum import Enum


class GroupMemberStatus(str, Enum):
    ACTIVE = "active"
    LEFT = "left"