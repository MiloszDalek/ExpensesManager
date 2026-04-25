from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from typing import Optional, List
from app.enums import NotificationSeverity, InsightType, AggregationPeriod


class PeriodComparison(BaseModel):
    """Comparison data with previous period."""
    income_change_percent: Optional[Decimal] = None
    expenses_change_percent: Optional[Decimal] = None
    savings_change_percent: Optional[Decimal] = None


class KPISummaryResponse(BaseModel):
    """Main KPI summary for dashboard."""
    total_income: Decimal
    total_expenses: Decimal
    total_savings: Decimal
    remaining_budget: Decimal
    overspend_flag: bool
    budget_id: Optional[int] = None
    budget_name: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    previous_period_comparison: Optional[PeriodComparison] = None


class AttentionItem(BaseModel):
    """Item that needs user attention on dashboard."""
    id: str
    type: InsightType
    title: str
    description: str
    severity: NotificationSeverity
    action_url: Optional[str] = None
    priority: int
    reference_id: Optional[int] = None


class TrendDataPoint(BaseModel):
    """Single data point in a trend chart."""
    period: str  # ISO date or period label
    amount: Decimal
    label: Optional[str] = None  # Human-readable label
    currency: str  # Currency code for this data point


class TrendDataResponse(BaseModel):
    """Spending trend data over time."""
    period_type: AggregationPeriod
    data_points: List[TrendDataPoint]
    totals_by_currency: dict[str, Decimal]  # Total amount per currency
    currency: Optional[str] = None  # Deprecated: use totals_by_currency instead


class CategoryBreakdownItem(BaseModel):
    """Category spending breakdown item."""
    category_id: int
    category_name: str
    amount: Decimal
    percentage: Decimal
    currency: str  # Currency code for this item
    budget_allocated: Optional[Decimal] = None
    budget_remaining: Optional[Decimal] = None


class CategoryBreakdownResponse(BaseModel):
    """Complete category breakdown."""
    items: List[CategoryBreakdownItem]
    totals_by_currency: dict[str, Decimal]  # Total amount per currency
    currency: Optional[str] = None  # Deprecated: use totals_by_currency instead


class BudgetPoolStatusResponse(BaseModel):
    """Status of a single budget pool."""
    pool_id: int
    category_id: Optional[int] = None
    category_name: str
    pool_type: str  # FIXED or PERCENT_INCOME
    target_value: Decimal
    allocated: Decimal
    spent: Decimal
    remaining: Decimal
    usage_percentage: Optional[Decimal] = None
    status: str  # ON_TRACK | WARNING | EXCEEDED
    alert_threshold: Decimal


class BudgetStatusResponse(BaseModel):
    """Complete budget status overview."""
    budget_id: int
    budget_name: str
    pools: List[BudgetPoolStatusResponse]
    period_start: str
    period_end: str
    currency: str


class SettlementSnapshotResponse(BaseModel):
    """Settlement balance snapshot."""
    owed_to_me_by_currency: dict[str, Decimal]  # Amounts owed to user by currency
    i_owe_by_currency: dict[str, Decimal]  # Amounts user owes by currency
    net_balance_by_currency: dict[str, Decimal]  # Net balance by currency
    pending_settlements_count: int
    currency: Optional[str] = None  # Deprecated: use currency-specific fields instead
