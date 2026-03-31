from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.enums import CurrencyEnum
from app.services import ExpensePersonalService
from app.database import get_db
from app.schemas import (
    PersonalExpenseCreate,
    PersonalExpenseSummaryResponse,
    PersonalExpenseUpdate,
    PersonalExpenseResponse,
)
from app.models import User
from app.utils.auth_dependencies import get_current_active_user

expense_personal_router = APIRouter(
    prefix="/expenses/personal",
    tags=["Personal Expenses"],
)

def get_expense_service(db: Session = Depends(get_db)):
    return ExpensePersonalService(db)


@expense_personal_router.post("/", response_model=PersonalExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_personal_expense(
    expense_in: PersonalExpenseCreate,
    service: ExpensePersonalService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.create_personal_expense(expense_in, current_user.id)


@expense_personal_router.get("/", response_model=list[PersonalExpenseResponse], status_code=status.HTTP_200_OK)
def get_personal_expenses(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    category_id: int | None = Query(default=None, ge=1),
    currency: CurrencyEnum | None = Query(default=None),
    sort_by: Literal["expense_date", "amount", "created_at"] = Query(default="expense_date"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    service: ExpensePersonalService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_personal_expenses(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        currency=currency,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@expense_personal_router.get(
    "/summary",
    response_model=PersonalExpenseSummaryResponse,
    status_code=status.HTTP_200_OK,
)
def get_personal_expenses_summary(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    category_id: int | None = Query(default=None, ge=1),
    currency: CurrencyEnum | None = Query(default=None),
    top_categories_limit: int = Query(default=5, ge=1, le=20),
    service: ExpensePersonalService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_personal_expenses_summary(
        user_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        currency=currency,
        top_categories_limit=top_categories_limit,
    )


@expense_personal_router.patch("/{expense_id}", response_model=PersonalExpenseResponse, status_code=status.HTTP_200_OK)
def edit_personal_expense(
    expense_id: int,
    expense_in: PersonalExpenseUpdate,
    service: ExpensePersonalService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.edit_personal_expense(expense_id, expense_in, current_user.id)


@expense_personal_router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_personal_expense(
    expense_id: int,
    service: ExpensePersonalService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    service.delete_personal_expense(expense_id, current_user.id)
