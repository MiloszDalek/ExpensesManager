from sqlalchemy.orm import Session
from app.repositories import ExpenseRepository
from .category_service import CategoryService
from app.models import Expense
from app.schemas import PersonalExpenseCreate, PersonalExpenseUpdate
from fastapi import HTTPException


class ExpensePersonalService:
    def __init__(self, db: Session):
        self.expense_repo = ExpenseRepository(db)
        self.category_service = CategoryService(db)

    
    # -- Personal Expenses

    def create_personal_expense(self, expense_in: PersonalExpenseCreate, user_id: int):
        if expense_in.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")
        
        self.category_service.validate_available_for_personal_expense(expense_in.category_id, user_id)
        
        try:
            expense = Expense(
                title=expense_in.title,
                amount=expense_in.amount,
                currency=expense_in.currency,
                expense_date=expense_in.expense_date,
                notes=expense_in.notes,
                receipt_image_url=expense_in.receipt_image_url,
                receipt_text=expense_in.receipt_text,
                user_id=user_id,
                group_id=None,
                category_id=expense_in.category_id
            )

            expense = self.expense_repo.create(expense)

            self.expense_repo.save_all()

            return expense
        
        except Exception:
            self.expense_repo.db.rollback()
            raise
    

    def get_personal_expenses(self, user_id: int, limit: int, offset: int):
        return self.expense_repo.get_personal_by_user_id(user_id, limit, offset)


    def edit_personal_expense(self, expense_id: int, expense_in: PersonalExpenseUpdate, user_id: int):
        expense = self.expense_repo.get_by_id(expense_id)
        
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        if expense.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if expense.group_id is not None:
            raise HTTPException(status_code=400, detail="Not a personal expense")
        
        try:
            update_data = expense_in.model_dump(exclude_unset=True)

            if "category_id" in update_data:
                self.category_service.validate_available_for_personal_expense(update_data["category_id"], user_id)

            expense = self.expense_repo.update(expense, update_data)
            self.expense_repo.save_all()

            return expense
        
        except Exception:
            self.expense_repo.db.rollback()
            raise
    

    def delete_personal_expense(self, expense_id: int, user_id: int):
        expense = self.expense_repo.get_by_id(expense_id)

        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        if expense.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if expense.group_id is not None:
            raise HTTPException(status_code=400, detail="Not a personal expense")
        
        self.expense_repo.delete(expense)
        self.expense_repo.save_all()

