from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import CurrencyEnum
from app.models import User
from app.schemas import IncomeEntryCreate, IncomeEntryResponse, IncomeSummaryResponse
from app.services import IncomeService
from app.utils.auth_dependencies import get_current_active_user


income_router = APIRouter(
    prefix="/income",
    tags=["Income"],
)


def get_income_service(db: Session = Depends(get_db)):
    return IncomeService(db)


@income_router.post("/", response_model=IncomeEntryResponse, status_code=status.HTTP_201_CREATED)
def create_income_entry(
    income_in: IncomeEntryCreate,
    service: IncomeService = Depends(get_income_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.create_income_entry(income_in, current_user.id)


@income_router.get("/", response_model=list[IncomeEntryResponse], status_code=status.HTTP_200_OK)
def list_income_entries(
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    currency: CurrencyEnum | None = Query(default=None),
    sort_by: Literal["income_date", "amount", "created_at"] = Query(default="income_date"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    service: IncomeService = Depends(get_income_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.list_income_entries(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        date_from=date_from,
        date_to=date_to,
        currency=currency,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@income_router.get("/summary", response_model=IncomeSummaryResponse, status_code=status.HTTP_200_OK)
def get_income_summary(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    service: IncomeService = Depends(get_income_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_income_summary(
        user_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
    )


@income_router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income_entry(
    income_id: int,
    service: IncomeService = Depends(get_income_service),
    current_user: User = Depends(get_current_active_user),
):
    service.delete_income_entry(income_id, current_user.id)
