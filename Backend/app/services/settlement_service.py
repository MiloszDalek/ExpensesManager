from sqlalchemy.orm import Session
from app.repositories import SettlementRepository
from .group_service import GroupService
from .balance_service import BalanceService
from app.schemas import SettlementCreate
from app.models import Settlement
from app.enums import PaymentMethod
from fastapi import HTTPException
from decimal import Decimal
from collections import defaultdict


class SettlementService:
    def __init__(self, db: Session):
        self.settlement_repo = SettlementRepository(db)
        self.group_service = GroupService(db)
        self.balance_service = BalanceService(db)

    def _resolve_group_currency(self, group_id: int):
        group = self.group_service.group_repo.get_by_id(group_id)
        if group is None:
            raise HTTPException(404, "Group not found")
        return group.currency
    

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
            payment_method=PaymentMethod.CASH,
            transaction_id=settlement_in.transaction_id,
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

        balances_by_currency = defaultdict(list)
        for item in balances_by_group:
            currency = self._resolve_group_currency(item.group_id)
            balances_by_currency[currency].append({
                "group_id": item.group_id,
                "balance": Decimal(item.balance),
            })

        settlements = []

        for currency, items in balances_by_currency.items():
            debt_buckets = [
                {"group_id": item["group_id"], "remaining": abs(item["balance"]) }
                for item in items
                if item["balance"] < 0
            ]
            credit_buckets = [
                {"group_id": item["group_id"], "remaining": item["balance"] }
                for item in items
                if item["balance"] > 0
            ]

            total_debt = sum((bucket["remaining"] for bucket in debt_buckets), Decimal("0.00"))
            total_credit = sum((bucket["remaining"] for bucket in credit_buckets), Decimal("0.00"))

            if total_debt <= 0:
                continue

            offset_amount = min(total_debt, total_credit)
            net_cash_amount = total_debt - offset_amount

            def create_settlement_record(
                payer_user_id: int,
                receiver_user_id: int,
                group_id: int,
                amount: Decimal,
                payment_method: PaymentMethod = PaymentMethod.CASH,
                transaction_id: str | None = None,
            ):
                if amount <= 0:
                    return

                settlement = Settlement(
                    from_user_id=payer_user_id,
                    to_user_id=receiver_user_id,
                    group_id=group_id,
                    amount=amount,
                    currency=currency,
                    payment_method=payment_method,
                    transaction_id=transaction_id,
                )
                self.settlement_repo.create(settlement)
                settlements.append(settlement)

            remaining_cash = net_cash_amount
            for bucket in debt_buckets:
                if remaining_cash <= 0:
                    break

                chunk = min(bucket["remaining"], remaining_cash)
                create_settlement_record(
                    payer_user_id=from_user_id,
                    receiver_user_id=settlement_in.to_user_id,
                    group_id=bucket["group_id"],
                    amount=chunk,
                    transaction_id=settlement_in.transaction_id,
                )

                bucket["remaining"] -= chunk
                remaining_cash -= chunk

            remaining_offset = offset_amount
            for bucket in debt_buckets:
                if remaining_offset <= 0:
                    break

                chunk = min(bucket["remaining"], remaining_offset)
                create_settlement_record(
                    payer_user_id=from_user_id,
                    receiver_user_id=settlement_in.to_user_id,
                    group_id=bucket["group_id"],
                    amount=chunk,
                    payment_method=PaymentMethod.OFFSET_APPLIED,
                )

                bucket["remaining"] -= chunk
                remaining_offset -= chunk

            remaining_forgiven = offset_amount
            for bucket in credit_buckets:
                if remaining_forgiven <= 0:
                    break

                chunk = min(bucket["remaining"], remaining_forgiven)
                create_settlement_record(
                    payer_user_id=settlement_in.to_user_id,
                    receiver_user_id=from_user_id,
                    group_id=bucket["group_id"],
                    amount=chunk,
                    payment_method=PaymentMethod.OFFSET_FORGIVEN,
                )

                bucket["remaining"] -= chunk
                remaining_forgiven -= chunk

        if not settlements:
            raise HTTPException(400, "No debts to settle")

        self.settlement_repo.save_all()

        return settlements


    def get_settlements_by_group(self, group_id: int, limit: int, offset: int, user_id: int):
        group = self.group_service.get_group(group_id, user_id)

        return self.settlement_repo.get_by_group_id(group.id, limit, offset)
    

    def get_settlements_by_user(self, limit: int, offset: int, user_id: int):
        return self.settlement_repo.get_by_user_id(limit, offset, user_id)