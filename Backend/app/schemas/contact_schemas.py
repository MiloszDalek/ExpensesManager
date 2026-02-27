from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ContactBase(BaseModel):
    user_id: int
    contact_id: int
    status: str  # pending, accepted, blocked

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)