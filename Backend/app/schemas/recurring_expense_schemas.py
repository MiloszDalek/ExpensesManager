from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator

from app.enums import (
    CurrencyEnum,
    RecurrenceFrequency,
    RecurringExpenseStatus,
    SplitType,
)


class RecurringExpenseParticipantInput(BaseModel):
    user_id: int
    share_amount: Decimal | None = None
    share_percentage: Decimal | None = None

    @model_validator(mode="after")
    def validate_share_shape(self):
        if self.share_amount is not None and self.share_amount < 0:
            raise ValueError("share_amount must be greater than or equal to 0")

        if self.share_percentage is not None and (
            self.share_percentage < 0 or self.share_percentage > 100
        ):
            raise ValueError("share_percentage must be in range 0..100")

        return self


class RecurringExpenseParticipantResponse(RecurringExpenseParticipantInput):
    id: int
    recurring_expense_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PersonalRecurringExpenseCreate(BaseModel):
    title: str
    amount: Decimal
    currency: CurrencyEnum = CurrencyEnum.PLN
    category_id: int
    frequency: RecurrenceFrequency
    interval_count: int = 1
    day_of_month: int | None = None
    day_of_week: int | None = None
    starts_on: date
    ends_on: date | None = None
    notes: str | None = None


class GroupRecurringExpenseCreate(BaseModel):
    title: str
    amount: Decimal
    currency: CurrencyEnum
    category_id: int
    split_type: SplitType
    frequency: RecurrenceFrequency
    interval_count: int = 1
    day_of_month: int | None = None
    day_of_week: int | None = None
    starts_on: date
    ends_on: date | None = None
    notes: str | None = None
    participants: list[RecurringExpenseParticipantInput]


class RecurringExpenseUpdate(BaseModel):
    title: str | None = None
    amount: Decimal | None = None
    currency: CurrencyEnum | None = None
    category_id: int | None = None
    split_type: SplitType | None = None
    frequency: RecurrenceFrequency | None = None
    interval_count: int | None = None
    day_of_month: int | None = None
    day_of_week: int | None = None
    starts_on: date | None = None
    ends_on: date | None = None
    next_due_on: date | None = None
    status: RecurringExpenseStatus | None = None
    notes: str | None = None
    participants: list[RecurringExpenseParticipantInput] | None = None


class RecurringExpenseResponse(BaseModel):
    id: int
    user_id: int
    group_id: int | None
    title: str
    amount: Decimal
    currency: CurrencyEnum
    category_id: int
    split_type: SplitType | None
    frequency: RecurrenceFrequency
    interval_count: int
    day_of_month: int | None
    day_of_week: int | None
    starts_on: date
    ends_on: date | None
    next_due_on: date
    status: RecurringExpenseStatus
    notes: str | None
    last_generated_at: datetime | None
    last_error: str | None
    created_at: datetime
    updated_at: datetime
    participants: list[RecurringExpenseParticipantResponse]

    model_config = ConfigDict(from_attributes=True)


class RecurringGenerationSummaryResponse(BaseModel):
    processed_series_count: int
    generated_count: int
    skipped_existing_count: int
    failed_series_count: int


class RecurringForecastItem(BaseModel):
    recurring_expense_id: int
    title: str
    scope: Literal["personal", "group"]
    occurrence_date: date
    currency: CurrencyEnum
    category_id: int
    group_id: int | None
    total_amount: Decimal
    user_amount: Decimal


class RecurringForecastResponse(BaseModel):
    total_count: int
    items: list[RecurringForecastItem]