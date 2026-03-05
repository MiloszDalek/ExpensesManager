from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.enums import InvitationStatus, InvitationType


class ContactInvitationBase(BaseModel):
    to_user_id: int


class ContactInvitationCreate(ContactInvitationBase):
    pass


class ContactInvitationResponse(ContactInvitationBase):
    id: int
    type: InvitationType
    status: InvitationStatus
    from_user_id: int
    created_at: datetime
    responded_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class GroupInvitationCreate(ContactInvitationBase):
    group_id: int


class GroupInvitationResponse(ContactInvitationBase):
    id: int
    type: InvitationType
    status: InvitationStatus
    group_id: int
    from_user_id: int
    created_at: datetime
    responded_at: datetime | None

    model_config = ConfigDict(from_attributes=True)