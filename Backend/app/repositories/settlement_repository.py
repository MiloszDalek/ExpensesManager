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
