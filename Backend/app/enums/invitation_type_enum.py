from enum import Enum


class InvitationType(str, Enum):
    CONTACT = "contact"
    GROUP = "group"