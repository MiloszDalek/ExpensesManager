from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import Expense


class ExpenseRepository:
    def __init__(self, db: Session):
        self.db = db

    
    def create(self, expense: Expense) -> Expense:
        self.db.add(expense)
        self.db.commit()
        self.db.refresh(expense)
        return expense


    def get_by_id(self, expense_id: int) -> Expense | None:
        return self.db.query(Expense).filter(Expense.id == expense_id).first()


    def get_by_group(self, group_id: int) -> list[Expense]:
        return self.db.query(Expense).filter(Expense.group_id == group_id).all()
    

    def update(self, expense_id: int, new_data: dict) -> Expense | None:
        expense = self.get_by_id(expense_id)
        if not expense:
            return None
        for key, value in new_data.items():
            setattr(expense, key, value)
        self.db.commit()
        self.db.refresh(expense)
        return expense
    
    
    def delete(self, expense_id: int) -> bool:
        expense = self.get_by_id(expense_id)
        if not expense:
            return False
        self.db.delete(expense)
        self.db.commit()
        return True
    

    def sum_personal_expenses(self, user_id: int) -> float:
        result = (
            self.db.query(Expense)
            .filter(
                Expense.is_personal == True,
                Expense.paid_by_id == user_id
            )
            .with_entities(func.coalesce(func.sum(Expense.amount), 0))
            .scalar()
        )
        return float(result)