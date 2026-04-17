from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import ExpenseShare, Expense


class ExpenseShareRepository:
    def __init__(self, db: Session):
        self.db = db


    def create(self, expenseShare: ExpenseShare):
        self.db.add(expenseShare)
        self.db.flush()


    def delete_by_expense_id(self, expense_id: int):
        self.db.query(ExpenseShare).filter(ExpenseShare.expense_id == expense_id).delete()

    def list_user_ids_by_expense_id(self, expense_id: int) -> list[int]:
        return [
            int(row.user_id)
            for row in self.db.query(ExpenseShare.user_id).filter(ExpenseShare.expense_id == expense_id).all()
        ]


    def save_all(self):
        self.db.commit()