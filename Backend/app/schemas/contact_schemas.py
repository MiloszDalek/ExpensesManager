from datetime import datetime
from pydantic import BaseModel, ConfigDict, AliasPath, EmailStr, Field


class ContactBase(BaseModel):
    user_id: int
    contact_id: int
    

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: int
    created_at: datetime
    email: EmailStr = Field(validation_alias=AliasPath("contact", "email"))
    username: str = Field(validation_alias=AliasPath("contact", "username"))

    model_config = ConfigDict(from_attributes=True)