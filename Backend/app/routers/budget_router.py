from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import BudgetStatus
from app.models import User
from app.schemas import (
    BudgetRolloverExecutionResponse,
    BudgetRolloverRunDueResponse,
    BudgetPlanCreate,
    BudgetPlanResponse,
    BudgetPlanUpdate,
    BudgetPoolCreate,
    BudgetPoolResponse,
    BudgetPoolUpdate,
    BudgetSummaryResponse,
)
from app.services import BudgetService
from app.utils.auth_dependencies import get_current_active_user, get_current_admin_user


budget_router = APIRouter(
    prefix="/budgets",
    tags=["Budgets"],
)


def get_budget_service(db: Session = Depends(get_db)):
    return BudgetService(db)


@budget_router.post("/", response_model=BudgetPlanResponse, status_code=status.HTTP_201_CREATED)
def create_budget_plan(
    budget_in: BudgetPlanCreate,
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.create_budget_plan(budget_in, current_user.id)


@budget_router.get("/", response_model=list[BudgetPlanResponse], status_code=status.HTTP_200_OK)
def list_budget_plans(
    status_filter: BudgetStatus | None = Query(default=None, alias="status"),
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.list_budget_plans(current_user.id, status_filter)


@budget_router.get("/{budget_id}", response_model=BudgetPlanResponse, status_code=status.HTTP_200_OK)
def get_budget_plan(
    budget_id: int,
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_budget_plan(budget_id, current_user.id)


@budget_router.patch("/{budget_id}", response_model=BudgetPlanResponse, status_code=status.HTTP_200_OK)
def update_budget_plan(
    budget_id: int,
    budget_in: BudgetPlanUpdate,
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.update_budget_plan(budget_id, budget_in, current_user.id)


@budget_router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget_plan(
    budget_id: int,
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    service.delete_budget_plan(budget_id, current_user.id)


@budget_router.post("/{budget_id}/pools", response_model=BudgetPoolResponse, status_code=status.HTTP_201_CREATED)
def add_budget_pool(
    budget_id: int,
    pool_in: BudgetPoolCreate,
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.add_budget_pool(budget_id, pool_in, current_user.id)


@budget_router.patch("/{budget_id}/pools/{pool_id}", response_model=BudgetPoolResponse, status_code=status.HTTP_200_OK)
def update_budget_pool(
    budget_id: int,
    pool_id: int,
    pool_in: BudgetPoolUpdate,
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.update_budget_pool(budget_id, pool_id, pool_in, current_user.id)


@budget_router.delete("/{budget_id}/pools/{pool_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget_pool(
    budget_id: int,
    pool_id: int,
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    service.delete_budget_pool(budget_id, pool_id, current_user.id)


@budget_router.get("/{budget_id}/summary", response_model=BudgetSummaryResponse, status_code=status.HTTP_200_OK)
def get_budget_summary(
    budget_id: int,
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_budget_summary(budget_id, current_user.id)


@budget_router.post("/{budget_id}/recalculate", response_model=BudgetSummaryResponse, status_code=status.HTTP_200_OK)
def recalculate_budget_state(
    budget_id: int,
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.recalculate_budget_state(budget_id, current_user.id)


@budget_router.post("/{budget_id}/close", response_model=BudgetRolloverExecutionResponse, status_code=status.HTTP_200_OK)
def close_budget_period(
    budget_id: int,
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.close_budget_period(budget_id, current_user.id)


@budget_router.post("/rollover/run-due", response_model=BudgetRolloverRunDueResponse, status_code=status.HTTP_200_OK)
def run_due_budget_rollovers(
    service: BudgetService = Depends(get_budget_service),
    current_user: User = Depends(get_current_admin_user),
):
    return service.run_due_rollovers()
