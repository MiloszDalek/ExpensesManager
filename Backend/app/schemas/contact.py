import datetime
from pydantic import BaseModel


class ContactBase(BaseModel):
    user_id: int
    contact_id: int
    status: str  # pending, accepted, blocked

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True