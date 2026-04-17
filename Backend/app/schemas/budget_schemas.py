from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.enums import (
    BudgetAllocationStrategy,
    BudgetPeriodType,
    BudgetPoolType,
    BudgetStatus,
    CurrencyEnum,
    OverspendingStrategy,
)


class IncomeEntryBase(BaseModel):
    title: str
    source: str | None = None
    amount: Decimal
    currency: CurrencyEnum = CurrencyEnum.PLN
    income_date: datetime
    notes: str | None = None


class IncomeEntryCreate(IncomeEntryBase):
    pass


class IncomeEntryResponse(IncomeEntryBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncomeSummaryCurrency(BaseModel):
    currency: CurrencyEnum
    total_amount: Decimal


class IncomeSummaryResponse(BaseModel):
    totals_by_currency: list[IncomeSummaryCurrency]


class BudgetPoolBase(BaseModel):
    name: str
    category_id: int
    pool_type: BudgetPoolType
    target_value: Decimal
    alert_threshold: Decimal = Decimal("80")
    rollover_enabled: bool = True
    rollover_negative_enabled: bool = False


class BudgetPoolCreate(BudgetPoolBase):
    pass


class BudgetPoolUpdate(BaseModel):
    name: str | None = None
    category_id: int | None = None
    pool_type: BudgetPoolType | None = None
    target_value: Decimal | None = None
    alert_threshold: Decimal | None = None
    rollover_enabled: bool | None = None
    rollover_negative_enabled: bool | None = None


class BudgetPoolResponse(BudgetPoolBase):
    id: int
    budget_id: int
    allocated_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    rollover_amount: Decimal
    last_recalculated_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BudgetPlanCreate(BaseModel):
    name: str
    currency: CurrencyEnum = CurrencyEnum.PLN
    period_type: BudgetPeriodType
    allocation_strategy: BudgetAllocationStrategy = BudgetAllocationStrategy.PERCENT_INCOME
    period_start: date
    period_end: date
    income_target: Decimal | None = None
    include_group_expenses: bool = False
    use_template_50_30_20: bool = False
    pools: list[BudgetPoolCreate] = []


class BudgetPlanUpdate(BaseModel):
    name: str | None = None
    allocation_strategy: BudgetAllocationStrategy | None = None
    income_target: Decimal | None = None
    include_group_expenses: bool | None = None
    status: BudgetStatus | None = None


class BudgetPlanResponse(BaseModel):
    id: int
    user_id: int
    name: str
    currency: CurrencyEnum
    period_type: BudgetPeriodType
    allocation_strategy: BudgetAllocationStrategy
    period_start: date
    period_end: date
    income_target: Decimal | None = None
    include_group_expenses: bool
    status: BudgetStatus
    template_key: str | None = None
    created_at: datetime
    updated_at: datetime
    pools: list[BudgetPoolResponse]

    model_config = ConfigDict(from_attributes=True)


class BudgetPoolSummaryResponse(BaseModel):
    pool_id: int
    pool_name: str
    category_id: int
    category_name: str
    pool_type: BudgetPoolType
    configured_value: Decimal
    allocated_amount: Decimal
    target_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    utilization_percent: float | None
    alert_threshold: Decimal
    status: str


class BudgetSummaryResponse(BaseModel):
    budget_id: int
    period_start: date
    period_end: date
    currency: CurrencyEnum
    include_group_expenses: bool
    income_total: Decimal
    spent_total: Decimal
    saved_total: Decimal
    savings_rate: float | None
    overspending_strategy: OverspendingStrategy
    pools: list[BudgetPoolSummaryResponse]


class BudgetRolloverExecutionResponse(BaseModel):
    from_budget_id: int
    to_budget_id: int
    rolled_pools_count: int
    total_rollover_amount: Decimal
    closed_at: date


class BudgetRolloverRunDueResponse(BaseModel):
    processed_budgets_count: int
    created_budgets_count: int
