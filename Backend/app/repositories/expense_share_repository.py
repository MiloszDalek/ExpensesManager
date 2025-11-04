from sqlalchemy.orm import Session
from app.models import ExpenseShare


class ExpenseShareRepository:
    def __init__(self, db: Session):
        self.db = db


    def create_many(self, shares: list[ExpenseShare]) -> list[ExpenseShare]:
        self.db.add_all(shares)
        self.db.commit()
        for s in shares:
            self.db.refresh(s)
        return shares


    def get_by_expense(self, expense_id: int) -> list[ExpenseShare]:
        return self.db.query(ExpenseShare).filter(ExpenseShare.expense_id == expense_id).all()


    def get_by_user(self, user_id: int) -> list[ExpenseShare]:
        return self.db.query(ExpenseShare).filter(ExpenseShare.user_id == user_id).all()


    def delete_by_expense(self, expense_id: int):
        self.db.query(ExpenseShare).filter(ExpenseShare.expense_id == expense_id).delete()
        self.db.commit()