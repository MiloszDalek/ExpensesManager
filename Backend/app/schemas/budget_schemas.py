from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.enums import BudgetPeriodType, BudgetPoolType, BudgetStatus, CurrencyEnum


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


class BudgetPoolCreate(BudgetPoolBase):
    pass


class BudgetPoolUpdate(BaseModel):
    name: str | None = None
    category_id: int | None = None
    pool_type: BudgetPoolType | None = None
    target_value: Decimal | None = None
    alert_threshold: Decimal | None = None


class BudgetPoolResponse(BudgetPoolBase):
    id: int
    budget_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BudgetPlanCreate(BaseModel):
    name: str
    currency: CurrencyEnum = CurrencyEnum.PLN
    period_type: BudgetPeriodType
    period_start: date
    period_end: date
    income_target: Decimal | None = None
    use_template_50_30_20: bool = False
    pools: list[BudgetPoolCreate] = []


class BudgetPlanUpdate(BaseModel):
    name: str | None = None
    income_target: Decimal | None = None
    status: BudgetStatus | None = None


class BudgetPlanResponse(BaseModel):
    id: int
    user_id: int
    name: str
    currency: CurrencyEnum
    period_type: BudgetPeriodType
    period_start: date
    period_end: date
    income_target: Decimal | None = None
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
    income_total: Decimal
    spent_total: Decimal
    saved_total: Decimal
    savings_rate: float | None
    pools: list[BudgetPoolSummaryResponse]
