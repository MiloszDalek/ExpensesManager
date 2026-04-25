from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date

from app.database import get_db
from app.services.dashboard_service import DashboardService
from app.schemas import (
    KPISummaryResponse,
    AttentionItem,
    TrendDataResponse,
    CategoryBreakdownResponse,
    BudgetStatusResponse,
    SettlementSnapshotResponse,
)
from app.enums import AggregationPeriod
from app.models import User
from app.utils.auth_dependencies import get_current_active_user


dashboard_router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


def get_dashboard_service(db: Session = Depends(get_db)):
    return DashboardService(db)


@dashboard_router.get("/kpi", response_model=KPISummaryResponse)
def get_kpi_summary(
    budget_id: Optional[int] = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_active_user),
):
    """Get KPI summary (income, expenses, savings, remaining budget)."""
    return service.get_kpi_summary(current_user.id, budget_id)


@dashboard_router.get("/attention", response_model=List[AttentionItem])
def get_attention_items(
    limit: int = Query(10, le=20),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_active_user),
):
    """Get priority-sorted list of items needing attention."""
    return service.get_attention_items(current_user.id, limit)


@dashboard_router.get("/trend", response_model=TrendDataResponse)
def get_spending_trend(
    period: AggregationPeriod = Query(AggregationPeriod.DAILY),
    budget_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_active_user),
):
    """Get spending trend data aggregated by period."""
    return service.get_spending_trend(
        user_id=current_user.id,
        period=period,
        budget_id=budget_id,
        date_from=date_from,
        date_to=date_to
    )


@dashboard_router.get("/categories", response_model=CategoryBreakdownResponse)
def get_category_breakdown(
    budget_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_active_user),
):
    """Get category spending breakdown with percentages."""
    return service.get_category_breakdown(
        user_id=current_user.id,
        budget_id=budget_id,
        date_from=date_from,
        date_to=date_to
    )


@dashboard_router.get("/budgets", response_model=List[BudgetStatusResponse])
def get_budget_status(
    budget_id: Optional[int] = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_active_user),
):
    """Get budget pool status for active budgets."""
    return service.get_budget_status(current_user.id, budget_id)


@dashboard_router.get("/settlements", response_model=SettlementSnapshotResponse)
def get_settlement_snapshot(
    service: DashboardService = Depends(get_dashboard_service),
    current_user: User = Depends(get_current_active_user),
):
    """Get settlement balance snapshot."""
    return service.get_settlement_snapshot(current_user.id)
