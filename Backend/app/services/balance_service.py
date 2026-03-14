from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories import ExpenseRepository, SettlementRepository
from app.services import ExpenseGroupService, GroupService
from app.schemas import GroupBalances, UserBalanceItem, ContactBalanceByGroup
from decimal import Decimal
import logging

logger = logging.getLogger()


class BalanceService:
    def __init__(self, db: Session):
        self.group_service = GroupService(db)
        self.expense_repo = ExpenseRepository(db)
        self.settlement_repo = SettlementRepository(db)


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

        completed_settlements = self.settlement_repo.get_completed_settlements(group_id, user_id)

        for s in completed_settlements:
            if s.from_user_id == user_id:
                balances[s.to_user_id] -= s.amount
            elif s.to_user_id == user_id:
                balances[s.from_user_id] += s.amount

        total_balance = sum(balances.values())

        balances_list = [UserBalanceItem(user_id=uid, amount=amount) for uid, amount in balances.items()]

        return GroupBalances(
            group_id=group_id,
            total_balance=total_balance,
            balances=balances_list
        )
    

    def get_contacts_balances(self, user_id: int) -> list[UserBalanceItem]:
        raw_balances = self.expense_repo.get_balances_with_users(user_id)
            
        balances = {row[0]: row[1] for row in raw_balances if row[0] != user_id}

        completed_settlements = self.settlement_repo.get_completed_settlements_for_user(user_id)
        for s in completed_settlements:
            if s.from_user_id == user_id:
                balances[s.to_user_id] = balances.get(s.to_user_id, 0) - s.amount
            elif s.to_user_id == user_id:
                balances[s.from_user_id] = balances.get(s.from_user_id, 0) + s.amount

        return [UserBalanceItem(user_id=uid, amount=amount) for uid, amount in balances.items() if uid != user_id]
    

    def get_contacts_balances_by_group(self, current_user_id: int, other_user_id: int) -> list[ContactBalanceByGroup]:
        if current_user_id == other_user_id:
            raise HTTPException(status_code=400, detail="Cannot get balance with yourself")

        raw_balances = self.expense_repo.get_balance_with_user_by_group(current_user_id, other_user_id)
        balances_map = {row[0]: row[1] for row in raw_balances}  # group_id -> balance

        # dodanie settlementów w grupach
        completed_settlements = self.settlement_repo.get_completed_settlements_between_users(current_user_id, other_user_id)
        for s in completed_settlements:
            if s.from_user_id == current_user_id:
                balances_map[s.group_id] = balances_map.get(s.group_id, 0) - s.amount
            elif s.to_user_id == current_user_id:
                balances_map[s.group_id] = balances_map.get(s.group_id, 0) + s.amount

        balances = [ContactBalanceByGroup(group_id=gid, balance=bal) for gid, bal in balances_map.items()]
        return balances