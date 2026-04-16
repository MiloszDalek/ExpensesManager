from datetime import date, datetime, time
from typing import Literal

from sqlalchemy.orm import Session
from app.repositories import ExpenseRepository
from .category_service import CategoryService
from app.models import Expense
from app.schemas import PersonalExpenseCreate, PersonalExpenseUpdate
from fastapi import HTTPException
from app.enums import CurrencyEnum

from .budget_service import BudgetService


class ExpensePersonalService:
    def __init__(self, db: Session):
        self.expense_repo = ExpenseRepository(db)
        self.category_service = CategoryService(db)
        self.budget_service = BudgetService(db)

    
    # -- Personal Expenses

    def _resolve_category_ids(
        self,
        user_id: int,
        category_id: int | None = None,
        category_ids: list[int] | None = None,
    ) -> list[int] | None:
        resolved_ids: list[int] = []

        if category_id is not None:
            resolved_ids.append(category_id)

        if category_ids:
            resolved_ids.extend(category_ids)

        if not resolved_ids:
            return None

        # Preserve insertion order while deduplicating.
        unique_ids = list(dict.fromkeys(resolved_ids))

        for current_category_id in unique_ids:
            if current_category_id <= 0:
                raise HTTPException(status_code=400, detail="category_ids must contain only positive integers")

            self.category_service.validate_available_for_personal_expense(current_category_id, user_id)

        return unique_ids

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

            self.budget_service.sync_budget_state_for_date(
                user_id=user_id,
                currency=expense.currency,
                check_date=expense.expense_date.date(),
                enforce_overspending=True,
            )

            self.expense_repo.save_all()

            return expense
        
        except Exception:
            self.expense_repo.db.rollback()
            raise
    

    def get_personal_expenses(
        self,
        user_id: int,
        limit: int,
        offset: int,
        date_from: date | None = None,
        date_to: date | None = None,
        category_id: int | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        sort_by: Literal["expense_date", "amount", "created_at"] = "expense_date",
        sort_order: Literal["asc", "desc"] = "desc",
    ):
        if date_from and date_to and date_from > date_to:
            raise HTTPException(status_code=400, detail="date_from cannot be greater than date_to")

        resolved_category_ids = self._resolve_category_ids(
            user_id=user_id,
            category_id=category_id,
            category_ids=category_ids,
        )

        date_from_dt = datetime.combine(date_from, time.min) if date_from else None
        date_to_dt = datetime.combine(date_to, time.max) if date_to else None

        return self.expense_repo.get_personal_by_user_id(
            user_id=user_id,
            limit=limit,
            offset=offset,
            date_from=date_from_dt,
            date_to=date_to_dt,
            category_ids=resolved_category_ids,
            currency=currency,
            sort_by=sort_by,
            sort_order=sort_order,
        )


    def get_personal_expenses_summary(
        self,
        user_id: int,
        date_from: date | None = None,
        date_to: date | None = None,
        category_id: int | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        top_categories_limit: int = 5,
    ):
        if date_from and date_to and date_from > date_to:
            raise HTTPException(status_code=400, detail="date_from cannot be greater than date_to")

        resolved_category_ids = self._resolve_category_ids(
            user_id=user_id,
            category_id=category_id,
            category_ids=category_ids,
        )

        date_from_dt = datetime.combine(date_from, time.min) if date_from else None
        date_to_dt = datetime.combine(date_to, time.max) if date_to else None

        return self.expense_repo.get_personal_summary(
            user_id=user_id,
            date_from=date_from_dt,
            date_to=date_to_dt,
            category_ids=resolved_category_ids,
            currency=currency,
            top_categories_limit=top_categories_limit,
        )


    def edit_personal_expense(self, expense_id: int, expense_in: PersonalExpenseUpdate, user_id: int):
        expense = self.expense_repo.get_by_id(expense_id)
        
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        if expense.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if expense.group_id is not None:
            raise HTTPException(status_code=400, detail="Not a personal expense")

        old_expense_date = expense.expense_date.date()
        old_currency = expense.currency
        
        try:
            update_data = expense_in.model_dump(exclude_unset=True)

            if "category_id" in update_data:
                self.category_service.validate_available_for_personal_expense(update_data["category_id"], user_id)

            expense = self.expense_repo.update(expense, update_data)

            new_expense_date = expense.expense_date.date()
            new_currency = expense.currency

            if old_currency == new_currency and old_expense_date == new_expense_date:
                self.budget_service.sync_budget_state_for_date(
                    user_id=user_id,
                    currency=new_currency,
                    check_date=new_expense_date,
                    enforce_overspending=True,
                )
            else:
                self.budget_service.sync_budget_state_for_date(
                    user_id=user_id,
                    currency=old_currency,
                    check_date=old_expense_date,
                    enforce_overspending=False,
                )
                self.budget_service.sync_budget_state_for_date(
                    user_id=user_id,
                    currency=new_currency,
                    check_date=new_expense_date,
                    enforce_overspending=True,
                )

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

        expense_date = expense.expense_date.date()
        expense_currency = expense.currency
        
        self.expense_repo.delete(expense)

        self.budget_service.sync_budget_state_for_date(
            user_id=user_id,
            currency=expense_currency,
            check_date=expense_date,
            enforce_overspending=False,
        )

        self.expense_repo.save_all()

