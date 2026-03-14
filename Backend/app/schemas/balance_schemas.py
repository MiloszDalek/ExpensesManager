from pydantic import BaseModel
from decimal import Decimal


class UserBalanceItem(BaseModel):
    user_id: int
    amount: Decimal


class GroupBalances(BaseModel):
    group_id: int
    total_balance: Decimal
    balances: list[UserBalanceItem]


class ContactBalanceByGroup(BaseModel):
    group_id: int
    balance: Decimal
