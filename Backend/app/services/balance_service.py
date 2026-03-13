from sqlalchemy.orm import Session
from app.repositories import ExpenseRepository, ExpenseShareRepository
from app.services import ExpenseGroupService, GroupService
from app.schemas import GroupBalancesResponse, GroupBalanceItem
from decimal import Decimal
import logging

logger = logging.getLogger()


class BalanceService:
    def __init__(self, db: Session):
        self.expense_service = ExpenseGroupService(db)
        self.group_service = GroupService(db)
        self.expense_repo = ExpenseRepository(db)
        self.share_repo = ExpenseShareRepository(db)


    def get_group_balances(self, group_id, user_id):

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

        balances_list = [GroupBalanceItem(user_id=uid, amount=amount) for uid, amount in balances.items()]

        return GroupBalancesResponse(
            group_id=group_id,
            total_balance=total_balance,
            balances=balances_list
        )