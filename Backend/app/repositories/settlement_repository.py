from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Settlement


class SettlementRepository:
    def __init__(self, db: Session):
        self.db = db


    # 1. Ile user zapłacił innym (zmniejsza jego "owed")
    def sum_payments_made_by(self, user_id: int) -> float:
        result = (
            self.db.query(func.coalesce(func.sum(Settlement.amount), 0))
            .filter(Settlement.from_user_id == user_id)
            .scalar()
        )
        return float(result)


    # 2. Ile user dostał od innych (zmniejsza jego "receivable")
    def sum_payments_received_by(self, user_id: int) -> float:
        result = (
            self.db.query(func.coalesce(func.sum(Settlement.amount), 0))
            .filter(Settlement.to_user_id == user_id)
            .scalar()
        )
        return float(result)


    # 3. Surowa lista rozliczeń do bilansów
    def list_user_settlements(self, user_id: int):
        return (
            self.db.query(
                Settlement.from_user_id.label("from_user"),
                Settlement.to_user_id.label("to_user"),
                Settlement.amount
            )
            .filter(
                (Settlement.from_user_id == user_id) |
                (Settlement.to_user_id == user_id)
            )
            .all()
        )
