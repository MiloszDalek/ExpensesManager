from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    SavingsGoalAllocateRequest,
    SavingsGoalAutoAllocateSummaryResponse,
    SavingsGoalCreate,
    SavingsGoalProgressResponse,
    SavingsGoalResponse,
    SavingsGoalUpdate,
)
from app.services import GoalService
from app.utils.auth_dependencies import get_current_active_user


savings_goal_router = APIRouter(
    prefix="/savings-goals",
    tags=["Savings Goals"],
)


def get_goal_service(db: Session = Depends(get_db)):
    return GoalService(db)


@savings_goal_router.post("/", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
def create_savings_goal(
    payload: SavingsGoalCreate,
    service: GoalService = Depends(get_goal_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.create_goal(payload, current_user.id)


@savings_goal_router.get("/", response_model=list[SavingsGoalResponse], status_code=status.HTTP_200_OK)
def list_savings_goals(
    include_inactive: bool = Query(default=False),
    service: GoalService = Depends(get_goal_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.list_goals(current_user.id, include_inactive=include_inactive)


@savings_goal_router.get("/{goal_id}", response_model=SavingsGoalResponse, status_code=status.HTTP_200_OK)
def get_savings_goal(
    goal_id: int,
    service: GoalService = Depends(get_goal_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_goal(goal_id, current_user.id)


@savings_goal_router.get("/{goal_id}/progress", response_model=SavingsGoalProgressResponse, status_code=status.HTTP_200_OK)
def get_savings_goal_progress(
    goal_id: int,
    service: GoalService = Depends(get_goal_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_goal_progress(goal_id, current_user.id)


@savings_goal_router.patch("/{goal_id}", response_model=SavingsGoalResponse, status_code=status.HTTP_200_OK)
def update_savings_goal(
    goal_id: int,
    payload: SavingsGoalUpdate,
    service: GoalService = Depends(get_goal_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.update_goal(goal_id, payload, current_user.id)


@savings_goal_router.post("/{goal_id}/allocate", response_model=SavingsGoalProgressResponse, status_code=status.HTTP_200_OK)
def allocate_to_savings_goal(
    goal_id: int,
    payload: SavingsGoalAllocateRequest,
    service: GoalService = Depends(get_goal_service),
    current_user: User = Depends(get_current_active_user),
):
    result = service.allocate_to_goal(goal_id, payload, current_user.id)
    return service.get_goal_progress(result["goal"].id, current_user.id)


@savings_goal_router.post("/auto-allocate/{budget_id}", response_model=SavingsGoalAutoAllocateSummaryResponse, status_code=status.HTTP_200_OK)
def auto_allocate_for_budget(
    budget_id: int,
    service: GoalService = Depends(get_goal_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.auto_allocate_for_budget(budget_id, current_user.id)


@savings_goal_router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_savings_goal(
    goal_id: int,
    service: GoalService = Depends(get_goal_service),
    current_user: User = Depends(get_current_active_user),
):
    service.delete_goal(goal_id, current_user.id)
