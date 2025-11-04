from sqlalchemy.orm import Session
from app.repositories import ExpenseRepository, ExpenseShareRepository
from app.models import Expense, ExpenseShare
from app.schemas import ExpenseCreate
from fastapi import HTTPException


class ExpenseService:
    def __init__(self, db: Session):
        self.expense_repo = ExpenseRepository(db)
        self.share_repo = ExpenseShareRepository(db)

    
    def create_expense(self, data: ExpenseCreate, group_id: int, creator_id: int) -> Expense:
        expense = Expense(**data.model_dump(), group_id=group_id, created_by=creator_id)
        expense = self.expense_repo.create(expense)

        shares = [
            ExpenseShare(expense_id=expense.id, user_id=s.user_id, amount=s.amount)
            for s in data.shares
        ]
        self.share_repo.create_many(shares)
        return expense


    def get_expense(self, expense_id: int) -> Expense:
        expense = self.expense_repo.get_by_id(expense_id)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        return expense


    def list_group_expenses(self, group_id: int) -> list[Expense]:
        return self.expense_repo.get_by_group(group_id)


    def update_expense(self, expense_id: int, new_data: dict) -> Expense:
        expense = self.expense_repo.update(expense_id, new_data)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        return expense


    def delete_expense(self, expense_id: int):
        self.share_repo.delete_by_expense(expense_id)
        deleted = self.expense_repo.delete(expense_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Expense not found")
        return True