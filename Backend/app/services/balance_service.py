from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories import ExpenseRepository, ExpenseShareRepository
from app.services import ExpenseGroupService, GroupService
from app.schemas import GroupBalances, UserBalanceItem, ContactBalanceByGroup
from decimal import Decimal
import logging

logger = logging.getLogger()


class BalanceService:
    def __init__(self, db: Session):
        self.group_service = GroupService(db)
        self.expense_repo = ExpenseRepository(db)


    def get_group_balances(self, group_id, user_id) -> GroupBalances:

        group_members = self.group_service.get_all_members(group_id, user_id)
        
        user_ids = [member.user_id for member in group_members]

        balances = {uid: Decimal("0.00") for uid in user_ids if uid != user_id}

        paid_to_others = self.expense_repo.get_paid_to_others(group_id, user_id)
        owed_by_others = self.expense_repo.get_owed_by_others(group_id, user_id)

        logger.info("Paid to others: %s", paid_to_others)
        logger.info("Owed by others: %s", owed_by_others)

        for row in paid_to_others:
            balances[row[0]] += row[1] # index 0 = other_user_id, index 1 = sum share_amount

        for row in owed_by_others:
            balances[row[0]] -= row[1] # index 0 = other_user_id, index 1 = sum share_amount

        total_balance = sum(balances.values())

        balances_list = [UserBalanceItem(user_id=uid, amount=amount) for uid, amount in balances.items()]

        return GroupBalances(
            group_id=group_id,
            total_balance=total_balance,
            balances=balances_list
        )
    

    def get_contacts_balances(self, user_id: int) -> list[UserBalanceItem]:
        raw_balances = self.expense_repo.get_balances_with_users(user_id)
        
        balances = [UserBalanceItem(user_id=row[0], amount=row[1]) for row in raw_balances if row[0] != user_id]

        return balances
    

    def get_contacts_balances_by_group(self, current_user_id: int, other_user_id: int) -> list[ContactBalanceByGroup]:
        if current_user_id == other_user_id:
            raise HTTPException(status_code=400, detail="Cannot get balance with yourself")

        raw_balances = self.expense_repo.get_balance_with_user_by_group(current_user_id, other_user_id)

        logger.info("Owed by others: %s", raw_balances)

        balances = [ContactBalanceByGroup(group_id=row[0], balance=row[1]) for row in raw_balances]

        return balances