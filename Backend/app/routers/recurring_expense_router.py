from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import RecurringExpenseStatus
from app.models import User
from app.schemas import (
    GroupRecurringExpenseCreate,
    PersonalRecurringExpenseCreate,
    RecurringExpenseResponse,
    RecurringExpenseUpdate,
    RecurringForecastResponse,
    RecurringGenerationSummaryResponse,
)
from app.services import RecurringExpenseService
from app.utils.auth_dependencies import get_current_active_user, get_current_admin_user


recurring_expense_router = APIRouter(
    prefix="/recurring-expenses",
    tags=["Recurring Expenses"],
)


def get_recurring_expense_service(db: Session = Depends(get_db)):
    return RecurringExpenseService(db)


@recurring_expense_router.post(
    "/personal",
    response_model=RecurringExpenseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_personal_recurring_expense(
    recurring_in: PersonalRecurringExpenseCreate,
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.create_personal_recurring_expense(recurring_in, current_user.id)


@recurring_expense_router.post(
    "/group/{group_id}",
    response_model=RecurringExpenseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_group_recurring_expense(
    group_id: int,
    recurring_in: GroupRecurringExpenseCreate,
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.create_group_recurring_expense(recurring_in, group_id, current_user.id)


@recurring_expense_router.get("/forecast", response_model=RecurringForecastResponse)
def get_recurring_forecast(
    date_from: date = Query(...),
    date_to: date = Query(...),
    scope: Literal["all", "personal", "group"] = Query(default="all"),
    group_id: int | None = Query(default=None, ge=1),
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_forecast(
        user_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        scope=scope,
        group_id=group_id,
    )


@recurring_expense_router.post("/generate-due", response_model=RecurringGenerationSummaryResponse)
def generate_due_recurring_expenses(
    up_to_date: date | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.generate_due_expenses(
        user_id=current_user.id,
        up_to_date=up_to_date,
        limit=limit,
    )


@recurring_expense_router.post("/generate-due/global", response_model=RecurringGenerationSummaryResponse)
def generate_due_recurring_expenses_global(
    up_to_date: date | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=5000),
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_admin_user),
):
    return service.generate_due_expenses(
        user_id=None,
        up_to_date=up_to_date,
        limit=limit,
    )


@recurring_expense_router.get("/", response_model=list[RecurringExpenseResponse])
def list_recurring_expenses(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    scope: Literal["all", "personal", "group"] = Query(default="all"),
    group_id: int | None = Query(default=None, ge=1),
    status: RecurringExpenseStatus | None = Query(default=None),
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.list_recurring_expenses(
        user_id=current_user.id,
        scope=scope,
        group_id=group_id,
        status=status,
        limit=limit,
        offset=offset,
    )


@recurring_expense_router.get("/{recurring_expense_id}", response_model=RecurringExpenseResponse)
def get_recurring_expense(
    recurring_expense_id: int,
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_recurring_expense(recurring_expense_id, current_user.id)


@recurring_expense_router.patch("/{recurring_expense_id}", response_model=RecurringExpenseResponse)
def update_recurring_expense(
    recurring_expense_id: int,
    recurring_in: RecurringExpenseUpdate,
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.update_recurring_expense(recurring_expense_id, recurring_in, current_user.id)


@recurring_expense_router.post("/{recurring_expense_id}/pause", response_model=RecurringExpenseResponse)
def pause_recurring_expense(
    recurring_expense_id: int,
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.pause_recurring_expense(recurring_expense_id, current_user.id)


@recurring_expense_router.post("/{recurring_expense_id}/resume", response_model=RecurringExpenseResponse)
def resume_recurring_expense(
    recurring_expense_id: int,
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.resume_recurring_expense(recurring_expense_id, current_user.id)


@recurring_expense_router.post("/{recurring_expense_id}/archive", response_model=RecurringExpenseResponse)
def archive_recurring_expense(
    recurring_expense_id: int,
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.archive_recurring_expense(recurring_expense_id, current_user.id)


@recurring_expense_router.post("/{recurring_expense_id}/generate-now", response_model=RecurringGenerationSummaryResponse)
def generate_now_recurring_expense(
    recurring_expense_id: int,
    up_to_date: date | None = Query(default=None),
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.generate_for_recurring_expense(
        recurring_expense_id=recurring_expense_id,
        user_id=current_user.id,
        up_to_date=up_to_date,
    )


@recurring_expense_router.delete("/{recurring_expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_expense(
    recurring_expense_id: int,
    service: RecurringExpenseService = Depends(get_recurring_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    service.delete_recurring_expense(recurring_expense_id, current_user.id)