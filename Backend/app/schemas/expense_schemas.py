from pydantic import BaseModel, ConfigDict
from typing import Optional, Literal
from datetime import datetime, date
from decimal import Decimal
from app.enums import CurrencyEnum, SplitType


class ExpenseBase(BaseModel):
    title: str
    amount: Decimal
    currency: CurrencyEnum = CurrencyEnum.PLN
    expense_date: datetime
    category_id: int  
    notes: Optional[str] = None
    receipt_image_url: Optional[str] = None
    receipt_text: Optional[str] = None


class PersonalExpenseCreate(ExpenseBase):
    pass


class PersonalExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[CurrencyEnum] = None
    expense_date: Optional[datetime] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None
    receipt_image_url: Optional[str] = None
    receipt_text: Optional[str] = None


class PersonalExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PersonalExpenseSummaryCurrency(BaseModel):
    currency: CurrencyEnum
    total_amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class PersonalExpenseSummaryCategory(BaseModel):
    category_id: int
    category_name: str
    total_amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class PersonalExpenseSummaryResponse(BaseModel):
    total_count: int
    totals_by_currency: list[PersonalExpenseSummaryCurrency]
    top_categories: list[PersonalExpenseSummaryCategory]


class ExpenseShareSchema(BaseModel):
    user_id: int
    share_amount: Decimal


class GroupExpenseBase(ExpenseBase):
    split_type: SplitType
    shares: list[ExpenseShareSchema]


class GroupExpenseCreate(GroupExpenseBase):
    pass


class GroupExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[CurrencyEnum] = None
    expense_date: Optional[datetime] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None
    receipt_image_url: Optional[str] = None
    receipt_text: Optional[str] = None
    split_type: Optional[SplitType] = None
    shares: Optional[list[ExpenseShareSchema]] = None


class GroupExpenseResponse(GroupExpenseBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SummaryPeriod(BaseModel):
    date_from: date
    date_to: date


class SummaryTotalByCurrency(BaseModel):
    currency: CurrencyEnum
    total_amount: Decimal


class OwnVsGroupByCurrency(BaseModel):
    currency: CurrencyEnum
    personal_amount: Decimal
    group_amount: Decimal
    total_amount: Decimal


class SummaryTopCategory(BaseModel):
    category_id: int
    category_name: str
    total_amount: Decimal


class SummaryTopGroup(BaseModel):
    group_id: int
    group_name: str
    total_amount: Decimal


class SummaryComparisonByCurrency(BaseModel):
    currency: CurrencyEnum
    current_total: Decimal
    previous_total: Decimal
    delta_amount: Decimal
    delta_percent: float | None


class ExpenseSummaryOverviewResponse(BaseModel):
    total_count: int
    totals_by_currency: list[SummaryTotalByCurrency]
    own_vs_group: list[OwnVsGroupByCurrency]
    top_categories: list[SummaryTopCategory]
    top_groups: list[SummaryTopGroup]
    comparison_by_currency: list[SummaryComparisonByCurrency]
    current_period: SummaryPeriod
    previous_period: SummaryPeriod | None = None


class ExpenseDailyTrendPoint(BaseModel):
    date: date
    personal_amount: Decimal
    group_amount: Decimal
    total_amount: Decimal


class ExpenseDailyTrendCurrencySeries(BaseModel):
    currency: CurrencyEnum
    current: list[ExpenseDailyTrendPoint]
    previous: list[ExpenseDailyTrendPoint]


class ExpenseSummaryTrendsResponse(BaseModel):
    current_period: SummaryPeriod
    previous_period: SummaryPeriod | None = None
    currencies: list[ExpenseDailyTrendCurrencySeries]


class ExpenseSummaryDrilldownItem(BaseModel):
    expense_id: int
    scope: Literal["personal", "group"]
    title: str
    expense_date: datetime
    created_at: datetime
    currency: CurrencyEnum
    category_id: int
    category_name: str
    group_id: int | None = None
    group_name: str | None = None
    total_amount: Decimal
    user_amount: Decimal


class ExpenseSummaryDrilldownResponse(BaseModel):
    total_count: int
    items: list[ExpenseSummaryDrilldownItem]