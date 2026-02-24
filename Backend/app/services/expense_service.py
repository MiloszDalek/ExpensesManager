from sqlalchemy.orm import Session
from app.repositories import ExpenseRepository, ExpenseShareRepository, CategoryRepository
from app.models import Expense, ExpenseShare
from app.schemas import ExpenseCreate
from fastapi import HTTPException


class ExpenseService:
    def __init__(self, db: Session):
        self.expense_repo = ExpenseRepository(db)
        self.share_repo = ExpenseShareRepository(db)
        self.category_repo = CategoryRepository(db)

    
    # -- Personal Expenses

    def create_personal_expense(self, expense_in: ExpenseCreate, user_id: int):
        if expense_in.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")
        
        category = self.category_repo.get_available_for_personal_expense(expense_in.category_id, user_id)

        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        expense = Expense(
            title=expense_in.title,
            amount=expense_in.amount,
            currency=expense_in.currency,
            expense_date=expense_in.expense_date,
            notes=expense_in.notes,
            receipt_image_url=expense_in.receipt_image_url,
            receipt_text=expense_in.receipt_text,
            user_id=user_id,
            is_personal=True,
            group_id=None,
            category_id=expense_in.category_id
        )

        return self.expense_repo.create(expense)
    

    def get_all_personal_expenses(self, user_id: int):
        return self.expense_repo.get_all_personal_by_user_id(user_id)


    # -- inne reliktowe pozostałości vibecodingu narazie bez zastosowania

    # def create_expense(self, data: ExpenseCreate, group_id: int, payer_id: int) -> Expense:
    #     expense = Expense(**data.model_dump(), group_id=group_id, payer_id=payer_id)
    #     expense = self.expense_repo.create(expense)

    #     shares = [
    #         ExpenseShare(expense_id=expense.id, user_id=s.user_id, amount=s.amount)
    #         for s in data.shares
    #     ]
    #     self.share_repo.create_many(shares)
    #     return expense


    # def get_expense(self, expense_id: int) -> Expense:
    #     expense = self.expense_repo.get_by_id(expense_id)
    #     if not expense:
    #         raise HTTPException(status_code=404, detail="Expense not found")
    #     return expense


    # def list_group_expenses(self, group_id: int) -> list[Expense]:
    #     return self.expense_repo.get_by_group(group_id)


    # def update_expense(self, expense_id: int, new_data: dict) -> Expense:
    #     expense = self.expense_repo.update(expense_id, new_data)
    #     if not expense:
    #         raise HTTPException(status_code=404, detail="Expense not found")
    #     return expense


    # def delete_expense(self, expense_id: int):
    #     self.share_repo.delete_by_expense(expense_id)
    #     deleted = self.expense_repo.delete(expense_id)
    #     if not deleted:
    #         raise HTTPException(status_code=404, detail="Expense not found")
    #     return True