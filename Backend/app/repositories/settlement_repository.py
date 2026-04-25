from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Settlement
from app.enums import SettlementStatus


class SettlementRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_completed_settlements(self, group_id: int, user_id: int):
        return (
            self.db.query(
                Settlement.from_user_id,
                Settlement.to_user_id,
                func.coalesce(func.sum(Settlement.amount), 0).label("amount"),
            )
            .filter(
                Settlement.group_id == group_id,
                Settlement.status == SettlementStatus.COMPLETED,
                ((Settlement.from_user_id == user_id) | (Settlement.to_user_id == user_id)),
            )
            .group_by(Settlement.from_user_id, Settlement.to_user_id)
            .all()
        )

    def get_completed_settlements_for_user(self, user_id: int):
        return (
            self.db.query(Settlement)
            .filter(
                Settlement.status == SettlementStatus.COMPLETED,
                (Settlement.from_user_id == user_id) | (Settlement.to_user_id == user_id),
            )
            .all()
        )

    def get_completed_settlements_between_users(self, user1_id: int, user2_id: int):
        return (
            self.db.query(Settlement)
            .filter(
                Settlement.status == SettlementStatus.COMPLETED,
                ((Settlement.from_user_id == user1_id) & (Settlement.to_user_id == user2_id))
                | ((Settlement.from_user_id == user2_id) & (Settlement.to_user_id == user1_id)),
            )
            .all()
        )

    def get_by_group_id(self, group_id: int, limit: int, offset: int):
        return (
            self.db.query(Settlement)
            .filter(Settlement.group_id == group_id)
            .order_by(Settlement.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    def get_by_id(self, settlement_id: int):
        return self.db.query(Settlement).filter(Settlement.id == settlement_id).first()

    def get_by_paypal_order_id(self, paypal_order_id: str):
        return (
            self.db.query(Settlement)
            .filter(Settlement.paypal_order_id == paypal_order_id)
            .first()
        )

    def get_all_by_paypal_order_id(self, paypal_order_id: str):
        return (
            self.db.query(Settlement)
            .filter(Settlement.paypal_order_id == paypal_order_id)
            .all()
        )

    def get_by_user_id(self, limit: int, offset: int, user_id: int):
        return (
            self.db.query(Settlement)
            .filter((Settlement.from_user_id == user_id) | (Settlement.to_user_id == user_id))
            .order_by(Settlement.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    def create(self, settlement: Settlement):
        self.db.add(settlement)
        self.db.flush()

    def save_all(self):
        self.db.commit()

    def rollback(self):
        self.db.rollback()

    def get_pending_by_user(self, user_id: int) -> list[Settlement]:
        """Get all pending settlements for a user (as debtor)."""
        return (
            self.db.query(Settlement)
            .filter(
                Settlement.from_user_id == user_id,
                Settlement.status == SettlementStatus.PENDING
            )
            .all()
        )

    def get_all_pending(self) -> list[Settlement]:
        """Get all pending settlements."""
        return (
            self.db.query(Settlement)
            .filter(Settlement.status == SettlementStatus.PENDING)
            .all()
        )

    def get_snapshot_for_user(self, user_id: int):
        """Get settlement balance snapshot for a user by currency."""
        from decimal import Decimal
        from sqlalchemy import or_

        # Total owed to me (I'm the creditor) by currency
        owed_to_me_by_currency = (
            self.db.query(
                Settlement.currency.label('currency'),
                func.sum(Settlement.amount).label('total')
            )
            .filter(
                Settlement.to_user_id == user_id,
                Settlement.status == SettlementStatus.PENDING
            )
            .group_by(Settlement.currency)
            .all()
        )

        # Total I owe (I'm the debtor) by currency
        i_owe_by_currency = (
            self.db.query(
                Settlement.currency.label('currency'),
                func.sum(Settlement.amount).label('total')
            )
            .filter(
                Settlement.from_user_id == user_id,
                Settlement.status == SettlementStatus.PENDING
            )
            .group_by(Settlement.currency)
            .all()
        )

        # Count pending settlements
        pending_count = (
            self.db.query(func.count(Settlement.id))
            .filter(
                or_(
                    Settlement.to_user_id == user_id,
                    Settlement.from_user_id == user_id
                ),
                Settlement.status == SettlementStatus.PENDING
            )
            .scalar() or 0
        )

        # Convert to dictionaries
        owed_to_me_dict = {row.currency: Decimal(row.total or 0) for row in owed_to_me_by_currency}
        i_owe_dict = {row.currency: Decimal(row.total or 0) for row in i_owe_by_currency}

        # Get all unique currencies
        all_currencies = set(owed_to_me_dict.keys()) | set(i_owe_dict.keys())

        return {
            "owed_to_me_by_currency": owed_to_me_dict,
            "i_owe_by_currency": i_owe_dict,
            "all_currencies": all_currencies,
            "pending_settlements_count": pending_count
        }
