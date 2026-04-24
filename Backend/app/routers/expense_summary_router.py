from datetime import date
from io import BytesIO
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import CurrencyEnum
from app.models import User
from app.schemas import (
    ExpenseSummaryDrilldownResponse,
    ExpenseSummaryOverviewResponse,
    ExpenseSummaryTrendsResponse,
)
from app.services.expense_summary_service import ExpenseSummaryService
from app.utils.auth_dependencies import get_current_active_user


expense_summary_router = APIRouter(
    prefix="/expenses/summary",
    tags=["Expense Summary"],
)


def get_summary_service(db: Session = Depends(get_db)):
    return ExpenseSummaryService(db)


@expense_summary_router.get("/overview", response_model=ExpenseSummaryOverviewResponse)
def get_expense_summary_overview(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    scope: Literal["all", "personal", "group"] = Query(default="all"),
    category_id: int | None = Query(default=None, ge=1),
    category_ids: list[int] | None = Query(default=None),
    currency: CurrencyEnum | None = Query(default=None),
    group_id: int | None = Query(default=None, ge=1),
    top_categories_limit: int = Query(default=5, ge=1, le=20),
    top_groups_limit: int = Query(default=5, ge=1, le=20),
    compare_previous: bool = Query(default=True),
    service: ExpenseSummaryService = Depends(get_summary_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_overview(
        user_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        scope=scope,
        category_id=category_id,
        category_ids=category_ids,
        currency=currency,
        group_id=group_id,
        top_categories_limit=top_categories_limit,
        top_groups_limit=top_groups_limit,
        compare_previous=compare_previous,
    )


@expense_summary_router.get("/trends", response_model=ExpenseSummaryTrendsResponse)
def get_expense_summary_trends(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    scope: Literal["all", "personal", "group"] = Query(default="all"),
    granularity: Literal["daily", "weekly", "monthly"] = Query(default="daily"),
    category_id: int | None = Query(default=None, ge=1),
    category_ids: list[int] | None = Query(default=None),
    currency: CurrencyEnum | None = Query(default=None),
    group_id: int | None = Query(default=None, ge=1),
    compare_previous: bool = Query(default=True),
    service: ExpenseSummaryService = Depends(get_summary_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_trends(
        user_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        scope=scope,
        granularity=granularity,
        category_id=category_id,
        category_ids=category_ids,
        currency=currency,
        group_id=group_id,
        compare_previous=compare_previous,
    )


@expense_summary_router.get("/drilldown", response_model=ExpenseSummaryDrilldownResponse)
def get_expense_summary_drilldown(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    scope: Literal["all", "personal", "group"] = Query(default="all"),
    category_id: int | None = Query(default=None, ge=1),
    category_ids: list[int] | None = Query(default=None),
    currency: CurrencyEnum | None = Query(default=None),
    group_id: int | None = Query(default=None, ge=1),
    sort_by: Literal["expense_date", "amount", "created_at"] = Query(default="expense_date"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    service: ExpenseSummaryService = Depends(get_summary_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_drilldown(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        date_from=date_from,
        date_to=date_to,
        scope=scope,
        category_id=category_id,
        category_ids=category_ids,
        currency=currency,
        group_id=group_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@expense_summary_router.get("/export/csv")
def export_expense_summary_csv(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    scope: Literal["all", "personal", "group"] = Query(default="all"),
    category_id: int | None = Query(default=None, ge=1),
    category_ids: list[int] | None = Query(default=None),
    currency: CurrencyEnum | None = Query(default=None),
    group_id: int | None = Query(default=None, ge=1),
    sections: str | None = Query(default=None),
    sort_by: Literal["expense_date", "amount", "created_at"] = Query(default="expense_date"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    service: ExpenseSummaryService = Depends(get_summary_service),
    current_user: User = Depends(get_current_active_user),
):
    csv_payload = service.export_csv(
        user_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        scope=scope,
        category_id=category_id,
        category_ids=category_ids,
        currency=currency,
        group_id=group_id,
        sections=sections,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    stream = BytesIO(csv_payload["content"].encode("utf-8"))
    headers = {
        "Content-Disposition": f"attachment; filename={csv_payload['filename']}",
    }

    return StreamingResponse(stream, media_type="text/csv; charset=utf-8", headers=headers)


@expense_summary_router.get("/export/xlsx")
def export_expense_summary_xlsx(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    scope: Literal["all", "personal", "group"] = Query(default="all"),
    category_id: int | None = Query(default=None, ge=1),
    category_ids: list[int] | None = Query(default=None),
    currency: CurrencyEnum | None = Query(default=None),
    group_id: int | None = Query(default=None, ge=1),
    sections: str | None = Query(default=None),
    locale: str | None = Query(default=None),
    sort_by: Literal["expense_date", "amount", "created_at"] = Query(default="expense_date"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    service: ExpenseSummaryService = Depends(get_summary_service),
    current_user: User = Depends(get_current_active_user),
):
    xlsx_payload = service.export_xlsx(
        user_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        scope=scope,
        category_id=category_id,
        category_ids=category_ids,
        currency=currency,
        group_id=group_id,
        sections=sections,
        locale=locale,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    stream = BytesIO(xlsx_payload["content"])
    headers = {
        "Content-Disposition": f"attachment; filename={xlsx_payload['filename']}",
    }

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@expense_summary_router.get("/export/pdf")
def export_expense_summary_pdf(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    scope: Literal["all", "personal", "group"] = Query(default="all"),
    category_id: int | None = Query(default=None, ge=1),
    category_ids: list[int] | None = Query(default=None),
    currency: CurrencyEnum | None = Query(default=None),
    group_id: int | None = Query(default=None, ge=1),
    sections: str | None = Query(default=None),
    locale: str | None = Query(default=None),
    sort_by: Literal["expense_date", "amount", "created_at"] = Query(default="expense_date"),
    sort_order: Literal["asc", "desc"] = Query(default="desc"),
    service: ExpenseSummaryService = Depends(get_summary_service),
    current_user: User = Depends(get_current_active_user),
):
    pdf_payload = service.export_pdf(
        user_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        scope=scope,
        category_id=category_id,
        category_ids=category_ids,
        currency=currency,
        group_id=group_id,
        sections=sections,
        locale=locale,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    stream = BytesIO(pdf_payload["content"])
    headers = {
        "Content-Disposition": f"attachment; filename={pdf_payload['filename']}",
    }

    return StreamingResponse(stream, media_type="application/pdf", headers=headers)
