from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class SavingsGoalBase(BaseModel):
    name: str
    target_amount: Decimal
    deadline: date | None = None
    budget_pool_id: int | None = None
    auto_allocate_amount: Decimal | None = None


class SavingsGoalCreate(SavingsGoalBase):
    pass


class SavingsGoalUpdate(BaseModel):
    name: str | None = None
    target_amount: Decimal | None = None
    current_amount: Decimal | None = None
    deadline: date | None = None
    budget_pool_id: int | None = None
    auto_allocate_amount: Decimal | None = None
    is_active: bool | None = None


class SavingsGoalAllocateRequest(BaseModel):
    amount: Decimal
    budget_pool_id: int | None = None
    notes: str | None = None


class SavingsGoalAllocationResponse(BaseModel):
    id: int
    goal_id: int
    user_id: int
    budget_id: int | None = None
    budget_pool_id: int | None = None
    amount: Decimal
    allocation_type: str
    notes: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SavingsGoalResponse(SavingsGoalBase):
    id: int
    user_id: int
    current_amount: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SavingsGoalProgressResponse(BaseModel):
    goal: SavingsGoalResponse
    progress_percent: float
    remaining_amount: Decimal
    allocations: list[SavingsGoalAllocationResponse]


class SavingsGoalAutoAllocateSummaryResponse(BaseModel):
    budget_id: int
    processed_goals_count: int
    allocated_goals_count: int
    total_allocated_amount: Decimal
