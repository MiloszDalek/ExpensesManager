from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import CurrencyEnum
from app.models import User
from app.schemas import ExpenseCategoriesResponse
from app.services.expense_summary_service import ExpenseSummaryService
from app.utils.auth_dependencies import get_current_active_user


expense_categories_router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"],
)


def get_summary_service(db: Session = Depends(get_db)):
    return ExpenseSummaryService(db)


@expense_categories_router.get("/categories", response_model=ExpenseCategoriesResponse)
def get_expense_categories(
    range: str = Query(..., description="One of: current_week, previous_week, current_month, previous_month"),
    currency: CurrencyEnum = Query(...),
    service: ExpenseSummaryService = Depends(get_summary_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_categories_by_range(
        user_id=current_user.id,
        range_value=range,
        currency=currency,
    )
