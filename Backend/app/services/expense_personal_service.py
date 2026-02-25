from sqlalchemy.orm import Session
from app.repositories import ExpensePersonalRepository
from .category_service import CategoryService
from app.models import Expense
from app.schemas import ExpenseCreate, ExpenseUpdate
from fastapi import HTTPException


class ExpensePersonalService:
    def __init__(self, db: Session):
        self.expense_repo = ExpensePersonalRepository(db)
        self.category_service = CategoryService(db)

    
    # -- Personal Expenses

    def create_personal_expense(self, expense_in: ExpenseCreate, user_id: int):
        if expense_in.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")
        
        self.category_service.validate_available_for_personal_expense(expense_in.category_id, user_id)
        
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
        return self.expense_repo.get_all_by_user_id(user_id)


    def edit_personal_expense(self, expense_id: int, expense_in: ExpenseUpdate, user_id: int):
        expense = self.expense_repo.get_by_id(expense_id)
        
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        if expense.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if expense.group_id is not None:
            raise HTTPException(status_code=400, detail="Not a personal expense")
        
        update_data = expense_in.model_dump(exclude_unset=True)

        if "category_id" in update_data:
            self.category_service.validate_available_for_personal_expense(update_data["category_id"], user_id)

        
        return self.expense_repo.update(expense, update_data)
    

    def delete_personal_expense(self, expense_id: int, user_id: int):
        expense = self.expense_repo.get_by_id(expense_id)

        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        if expense.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if expense.group_id is not None:
            raise HTTPException(status_code=400, detail="Not a personal expense")
        
        self.expense_repo.delete(expense)


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