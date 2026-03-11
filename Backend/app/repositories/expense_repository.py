from sqlalchemy.orm import Session, selectinload
from app.models import Expense


class ExpenseRepository:
    def __init__(self, db: Session):
        self.db = db


    def create(self, expense: Expense) -> Expense:
        self.db.add(expense)
        self.db.flush()
        return expense


    def get_all_personal_by_user_id(self, user_id: int) -> list[Expense]:
        return self.db.query(Expense).filter(Expense.user_id == user_id, Expense.group_id.is_(None)).all()
    

    def get_all_group_by_group_id(self, group_id: int, limit: int, offset: int):
        return (
            self.db.query(Expense)
            .options(selectinload(Expense.shares))
            .filter(Expense.group_id == group_id)
            .order_by(Expense.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
    

    def get_by_id(self, expense_id: int) -> Expense | None:
        return self.db.query(Expense).filter(Expense.id == expense_id).first()


    def update(self, expense: Expense, update_data: dict) -> Expense:
        for field, value in update_data.items():
            setattr(expense, field, value)

        self.db.flush()
        return expense


    def delete(self, expense: Expense):
        self.db.delete(expense)
        self.db.flush()


    def save_all(self):
        self.db.commit()