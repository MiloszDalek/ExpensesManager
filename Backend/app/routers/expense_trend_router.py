from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import CurrencyEnum
from app.models import User
from app.schemas import ExpenseTrendResponse
from app.services.expense_summary_service import ExpenseSummaryService
from app.utils.auth_dependencies import get_current_active_user


expense_trend_router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"],
)


def get_summary_service(db: Session = Depends(get_db)):
    return ExpenseSummaryService(db)


@expense_trend_router.get("/trend", response_model=ExpenseTrendResponse)
def get_expense_trend(
    range: str = Query(..., description="One of: current_week, previous_week, current_month, previous_month"),
    currency: CurrencyEnum = Query(...),
    service: ExpenseSummaryService = Depends(get_summary_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_trend_by_range(
        user_id=current_user.id,
        range_value=range,
        currency=currency,
    )
