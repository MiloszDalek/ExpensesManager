from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import Expense


class ExpensePersonalRepository:
    def __init__(self, db: Session):
        self.db = db


    def create(self, expense: Expense) -> Expense:
        self.db.add(expense)
        self.db.commit()
        self.db.refresh(expense)
        return expense


    def get_all_by_user_id(self, user_id: int) -> list[Expense]:
        return self.db.query(Expense).filter(Expense.user_id == user_id, Expense.group_id.is_(None)).all()
    

    def get_by_id(self, expense_id: int) -> Expense | None:
        return self.db.query(Expense).filter(Expense.id == expense_id).first()


    def update(self, expense: Expense, update_data: dict) -> Expense:
        for field, value in update_data.items():
            setattr(expense, field, value)

        self.db.commit()
        self.db.refresh(expense)
        return expense


    def delete(self, expense: Expense):
        self.db.delete(expense)
        self.db.commit()
