from pydantic import BaseModel
from decimal import Decimal


class GroupBalanceResponse(BaseModel):
    user_id: int
    balance: Decimal