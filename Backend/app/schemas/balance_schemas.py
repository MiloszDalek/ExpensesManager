from pydantic import BaseModel
from decimal import Decimal


class GroupBalanceItem(BaseModel):
    user_id: int
    amount: Decimal


class GroupBalancesResponse(BaseModel):
    group_id: int
    total_balance: Decimal
    balances: list[GroupBalanceItem]
