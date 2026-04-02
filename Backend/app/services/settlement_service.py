from sqlalchemy.orm import Session
from app.repositories import SettlementRepository
from .group_service import GroupService
from .balance_service import BalanceService
from app.schemas import SettlementCreate
from app.models import Settlement
from app.enums import PaymentMethod
from fastapi import HTTPException


class SettlementService:
    def __init__(self, db: Session):
        self.settlement_repo = SettlementRepository(db)
        self.group_service = GroupService(db)
        self.balance_service = BalanceService(db)
    

    def create_group_settlement(self, settlement_in: SettlementCreate, from_user_id: int) -> Settlement:
        if from_user_id == settlement_in.to_user_id:
            raise HTTPException(400, "Cannot settle with yourself")

        if settlement_in.group_id is None:
            raise HTTPException(400, "Group id is required")
        
        group = self.group_service.get_group(settlement_in.group_id, from_user_id)

        self.group_service.get_member(group.id, from_user_id)
        self.group_service.get_member(group.id, settlement_in.to_user_id)

        balances = self.balance_service.get_group_balances(group.id, from_user_id)

        balance_with_user = None
        for item in balances.balances:
            if item.user_id == settlement_in.to_user_id:
                balance_with_user = item.amount
                break

        if balance_with_user is None:
            raise HTTPException(400, "No balance with this user")

        if balance_with_user == 0:
            raise HTTPException(400, "No debt between users")
        
        if balance_with_user > 0:
            raise HTTPException(400, "This user owes you money")
        
        settlement = Settlement(
            from_user_id=from_user_id,
            to_user_id=settlement_in.to_user_id,
            group_id=group.id,
            amount=abs(balance_with_user),
            currency=group.currency,
            payment_method=PaymentMethod.CASH
        )

        self.settlement_repo.create(settlement)
        self.settlement_repo.save_all()

        return settlement


    def create_total_settlement(self, settlement_in: SettlementCreate, from_user_id: int) -> list[Settlement]:
        if from_user_id == settlement_in.to_user_id:
            raise HTTPException(400, "Cannot settle with yourself")
        
        balances_by_group = self.balance_service.get_contacts_balances_by_group(
            current_user_id=from_user_id,
            other_user_id=settlement_in.to_user_id
        )

        settlements = []

        for item in balances_by_group:
            if item.balance >= 0:
                continue

            settlement = Settlement(
                from_user_id=from_user_id,
                to_user_id=settlement_in.to_user_id,
                group_id=item.group_id,
                amount=abs(item.balance),
                currency=self.group_service.get_group(item.group_id, from_user_id).currency,
                payment_method=PaymentMethod.CASH
            )
            self.settlement_repo.create(settlement)
            settlements.append(settlement)

        if not settlements:
            raise HTTPException(400, "No debts to settle")

        self.settlement_repo.save_all()

        return settlements


    def get_settlements_by_group(self, group_id: int, limit: int, offset: int, user_id: int):
        group = self.group_service.get_group(group_id, user_id)

        return self.settlement_repo.get_by_group_id(group.id, limit, offset)
    

    def get_settlements_by_user(self, limit: int, offset: int, user_id: int):
        return self.settlement_repo.get_by_user_id(limit, offset, user_id)