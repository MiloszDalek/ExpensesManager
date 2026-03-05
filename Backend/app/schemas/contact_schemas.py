from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ContactBase(BaseModel):
    user_id: int
    contact_id: int
    

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)