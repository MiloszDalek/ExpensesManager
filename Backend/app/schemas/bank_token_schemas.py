from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BankTokenBase(BaseModel):
    user_id: int
    provider: str = "GoCardless"
    bank_name: Optional[str] = None
    account_id: Optional[str] = None
    account_mask: Optional[str] = None
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None

class BankTokenCreate(BankTokenBase):
    pass

class BankTokenResponse(BankTokenBase):
    id: int

    class Config:
        from_attributes = True