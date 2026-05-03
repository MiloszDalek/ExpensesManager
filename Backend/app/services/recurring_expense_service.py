from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
from typing import Literal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.enums import (
    CurrencyEnum,
    GroupMemberStatus,
    RecurrenceFrequency,
    RecurringExpenseStatus,
    SplitType,
)
from app.models import Expense, ExpenseShare, RecurringExpense, RecurringExpenseParticipant
from app.repositories import RecurringExpenseRepository
from app.schemas import (
    GroupRecurringExpenseCreate,
    PersonalRecurringExpenseCreate,
    RecurringExpenseParticipantInput,
    RecurringExpenseUpdate,
)

from .category_service import CategoryService
from .budget_service import BudgetService
from .group_service import GroupService


RecurringScope = Literal["all", "personal", "group"]


class RecurringExpenseService:
    def __init__(self, db: Session):
        self.db = db
        self.recurring_repo = RecurringExpenseRepository(db)
        self.category_service = CategoryService(db)
        self.group_service = GroupService(db)
        self.budget_service = BudgetService(db)

    @staticmethod
    def _round_money(value: Decimal) -> Decimal:
        return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @staticmethod
    def _money_to_cents(value: Decimal) -> int:
        rounded = RecurringExpenseService._round_money(value)
        return int((rounded * 100).to_integral_value(rounding=ROUND_HALF_UP))

    @staticmethod
    def _add_months(value: date, months: int) -> date:
        month_index = value.month - 1 + months
        year = value.year + month_index // 12
        month = month_index % 12 + 1
        last_day = monthrange(year, month)[1]
        day = min(value.day, last_day)
        return date(year, month, day)

    @staticmethod
    def _calculate_next_due_date(series: RecurringExpense, current_occurrence: date) -> date:
        interval = series.interval_count or 1

        if series.frequency == RecurrenceFrequency.DAILY:
            next_due = current_occurrence + timedelta(days=interval)
        elif series.frequency == RecurrenceFrequency.WEEKLY:
            if series.day_of_week is None:
                next_due = current_occurrence + timedelta(days=7 * interval)
            else:
                candidate = current_occurrence + timedelta(days=1)
                while candidate.weekday() != series.day_of_week:
                    candidate += timedelta(days=1)
                candidate += timedelta(days=7 * max(interval - 1, 0))
                next_due = candidate
        elif series.frequency == RecurrenceFrequency.MONTHLY:
            next_due = RecurringExpenseService._add_months(current_occurrence, interval)
            if series.day_of_month is not None:
                last_day = monthrange(next_due.year, next_due.month)[1]
                next_due = date(next_due.year, next_due.month, min(series.day_of_month, last_day))
        elif series.frequency == RecurrenceFrequency.QUARTERLY:
            next_due = RecurringExpenseService._add_months(current_occurrence, interval * 3)
            if series.day_of_month is not None:
                last_day = monthrange(next_due.year, next_due.month)[1]
                next_due = date(next_due.year, next_due.month, min(series.day_of_month, last_day))
        else:
            next_due = RecurringExpenseService._add_months(current_occurrence, interval * 12)
            if series.day_of_month is not None:
                last_day = monthrange(next_due.year, next_due.month)[1]
                next_due = date(next_due.year, next_due.month, min(series.day_of_month, last_day))

        if next_due <= current_occurrence:
            return current_occurrence + timedelta(days=1)

        return next_due

    @staticmethod
    def _validate_recurrence_fields(
        frequency: RecurrenceFrequency,
        interval_count: int,
        starts_on: date,
        ends_on: date | None,
        day_of_month: int | None,
        day_of_week: int | None,
    ):
        if interval_count <= 0:
            raise HTTPException(status_code=400, detail="interval_count must be greater than 0")

        if ends_on is not None and ends_on < starts_on:
            raise HTTPException(status_code=400, detail="ends_on cannot be earlier than starts_on")

        if day_of_month is not None and (day_of_month < 1 or day_of_month > 31):
            raise HTTPException(status_code=400, detail="day_of_month must be in range 1..31")

        if day_of_week is not None and (day_of_week < 0 or day_of_week > 6):
            raise HTTPException(status_code=400, detail="day_of_week must be in range 0..6")

        if frequency == RecurrenceFrequency.WEEKLY and day_of_month is not None:
            raise HTTPException(status_code=400, detail="day_of_month is not supported for weekly recurrence")

        if frequency in (RecurrenceFrequency.MONTHLY, RecurrenceFrequency.QUARTERLY, RecurrenceFrequency.YEARLY):
            if day_of_week is not None:
                raise HTTPException(status_code=400, detail="day_of_week is only supported for weekly recurrence")

        if frequency == RecurrenceFrequency.DAILY and (day_of_month is not None or day_of_week is not None):
            raise HTTPException(status_code=400, detail="daily recurrence does not support day_of_month/day_of_week")

    def _validate_group_participants(
        self,
        group_id: int,
        split_type: SplitType,
        amount: Decimal,
        participants: list[RecurringExpenseParticipantInput],
    ):
        if not participants:
            raise HTTPException(status_code=400, detail="Group recurring expense requires participants")

        user_ids = [participant.user_id for participant in participants]
        if len(user_ids) != len(set(user_ids)):
            raise HTTPException(status_code=400, detail="Duplicate participants")

        for participant in participants:
            member = self.group_service.get_member(group_id, participant.user_id)
            if member.status != GroupMemberStatus.ACTIVE:
                raise HTTPException(status_code=400, detail="Only active group members can participate")

        rounded_amount = self._round_money(amount)

        if split_type == SplitType.PERCENT:
            if all(participant.share_percentage is not None for participant in participants):
                total_percent = sum((participant.share_percentage or Decimal("0")) for participant in participants)
                if abs(total_percent - Decimal("100")) > Decimal("0.01"):
                    raise HTTPException(status_code=400, detail="Percent shares must add up to 100")
                return

            if all(participant.share_amount is not None for participant in participants):
                if any((participant.share_amount or Decimal("0")) <= 0 for participant in participants):
                    raise HTTPException(status_code=400, detail="Share amounts must be positive")

                total_share = self._round_money(
                    sum((participant.share_amount or Decimal("0")) for participant in participants)
                )
                if total_share != rounded_amount:
                    raise HTTPException(status_code=400, detail="Split amounts must add up to total recurring amount")
                return

            raise HTTPException(
                status_code=400,
                detail="Percent split requires either share_percentage for all participants or resolved share_amount values",
            )

        if split_type == SplitType.EXACT:
            if any(participant.share_amount is None for participant in participants):
                raise HTTPException(status_code=400, detail="Exact split requires share_amount for all participants")

            if any((participant.share_amount or Decimal("0")) <= 0 for participant in participants):
                raise HTTPException(status_code=400, detail="Share amounts must be positive")

            total_share = self._round_money(
                sum((participant.share_amount or Decimal("0")) for participant in participants)
            )
            if total_share != rounded_amount:
                raise HTTPException(status_code=400, detail="Split amounts must add up to total recurring amount")
            return

        provided_amounts = [participant.share_amount for participant in participants]
        if all(share_amount is None for share_amount in provided_amounts):
            return

        if any(share_amount is None for share_amount in provided_amounts):
            raise HTTPException(status_code=400, detail="Equal split must provide all share amounts or none")

        if any((share_amount or Decimal("0")) <= 0 for share_amount in provided_amounts):
            raise HTTPException(status_code=400, detail="Share amounts must be positive")

        total_share = self._round_money(sum((share_amount or Decimal("0")) for share_amount in provided_amounts))
        if total_share != rounded_amount:
            raise HTTPException(status_code=400, detail="Split amounts must add up to total recurring amount")

    def _assert_series_access(self, recurring_expense: RecurringExpense, user_id: int):
        if recurring_expense.user_id != user_id:
            raise HTTPException(status_code=404, detail="Recurring expense not found")

    def _build_equal_shares(self, amount: Decimal, user_ids: list[int]) -> list[tuple[int, Decimal]]:
        if not user_ids:
            return []

        total_cents = self._money_to_cents(amount)
        base_cents = total_cents // len(user_ids)
        remainder = total_cents - base_cents * len(user_ids)

        shares: list[tuple[int, Decimal]] = []
        for index, user_id in enumerate(sorted(user_ids)):
            cents = base_cents + (1 if index < remainder else 0)
            shares.append((user_id, Decimal(cents) / Decimal("100")))

        return shares

    def _build_percent_shares(
        self,
        amount: Decimal,
        participants: list[RecurringExpenseParticipant],
    ) -> list[tuple[int, Decimal]]:
        total_cents = self._money_to_cents(amount)

        raw_values: list[tuple[int, Decimal]] = []
        floored_total = 0
        for participant in participants:
            percent = Decimal(participant.share_percentage or Decimal("0"))
            raw_cents = (Decimal(total_cents) * percent) / Decimal("100")
            floored = int(raw_cents.to_integral_value(rounding=ROUND_DOWN))
            floored_total += floored
            raw_values.append((participant.user_id, raw_cents - Decimal(floored)))

        remainder = total_cents - floored_total
        sorted_by_fraction = sorted(raw_values, key=lambda item: (item[1], -item[0]), reverse=True)

        cents_map = {
            participant.user_id: int(
                ((Decimal(total_cents) * Decimal(participant.share_percentage or Decimal("0"))) / Decimal("100"))
                .to_integral_value(rounding=ROUND_DOWN)
            )
            for participant in participants
        }

        index = 0
        while remainder > 0 and sorted_by_fraction:
            user_id = sorted_by_fraction[index % len(sorted_by_fraction)][0]
            cents_map[user_id] += 1
            remainder -= 1
            index += 1

        return [
            (user_id, Decimal(cents) / Decimal("100"))
            for user_id, cents in sorted(cents_map.items(), key=lambda item: item[0])
        ]

    def _resolve_occurrence_shares(self, recurring_expense: RecurringExpense) -> list[tuple[int, Decimal]]:
        participants = list(recurring_expense.participants)
        if not participants:
            raise HTTPException(status_code=400, detail="Group recurring expense has no participants")

        if recurring_expense.split_type == SplitType.PERCENT and all(
            participant.share_percentage is not None for participant in participants
        ):
            return self._build_percent_shares(recurring_expense.amount, participants)

        if all(participant.share_amount is not None for participant in participants):
            return [
                (participant.user_id, self._round_money(participant.share_amount or Decimal("0")))
                for participant in sorted(participants, key=lambda item: item.user_id)
            ]

        user_ids = [participant.user_id for participant in participants]
        return self._build_equal_shares(recurring_expense.amount, user_ids)

    def _sync_budget_for_materialized_expense(self, expense: Expense, affected_user_ids: set[int]):
        for current_user_id in affected_user_ids:
            self.budget_service.sync_budget_state_for_date(
                user_id=current_user_id,
                currency=expense.currency,
                check_date=expense.expense_date.date(),
                enforce_overspending=False,
            )

    def _materialize_occurrence(self, recurring_expense: RecurringExpense, occurrence_date: date):
        expense = Expense(
            group_id=recurring_expense.group_id,
            user_id=recurring_expense.user_id,
            title=recurring_expense.title,
            amount=self._round_money(recurring_expense.amount),
            currency=CurrencyEnum(recurring_expense.currency.value),
            split_type=recurring_expense.split_type,
            category_id=recurring_expense.category_id,
            expense_date=datetime.combine(occurrence_date, time.min),
            notes=recurring_expense.notes,
            receipt_image_url=None,
            receipt_text=None,
            recurring_expense_id=recurring_expense.id,
            recurring_occurrence_date=occurrence_date,
        )
        self.db.add(expense)
        self.db.flush()

        if recurring_expense.group_id is None:
            self._sync_budget_for_materialized_expense(expense, {recurring_expense.user_id})
            return

        affected_user_ids: set[int] = set()
        for user_id, share_amount in self._resolve_occurrence_shares(recurring_expense):
            self.db.add(
                ExpenseShare(
                    expense_id=expense.id,
                    user_id=user_id,
                    share_amount=self._round_money(share_amount),
                )
            )
            affected_user_ids.add(user_id)

        self.db.flush()
        self._sync_budget_for_materialized_expense(expense, affected_user_ids)

    def _generate_for_series_until(
        self,
        recurring_expense: RecurringExpense,
        up_to_date: date,
    ) -> tuple[int, int]:
        generated_count = 0
        skipped_existing_count = 0

        while (
            recurring_expense.status == RecurringExpenseStatus.ACTIVE
            and recurring_expense.next_due_on <= up_to_date
            and (recurring_expense.ends_on is None or recurring_expense.next_due_on <= recurring_expense.ends_on)
        ):
            occurrence_date = recurring_expense.next_due_on

            if self.recurring_repo.occurrence_exists(recurring_expense.id, occurrence_date):
                skipped_existing_count += 1
            else:
                self._materialize_occurrence(recurring_expense, occurrence_date)
                generated_count += 1

            recurring_expense.next_due_on = self._calculate_next_due_date(recurring_expense, occurrence_date)

        if recurring_expense.ends_on is not None and recurring_expense.next_due_on > recurring_expense.ends_on:
            recurring_expense.status = RecurringExpenseStatus.ENDED

        recurring_expense.last_generated_at = datetime.now(timezone.utc)

        return generated_count, skipped_existing_count

    def _replace_participants(
        self,
        recurring_expense: RecurringExpense,
        participants: list[RecurringExpenseParticipantInput],
    ):
        recurring_expense.participants.clear()
        self.db.flush()

        for participant in participants:
            recurring_expense.participants.append(
                RecurringExpenseParticipant(
                    user_id=participant.user_id,
                    share_amount=participant.share_amount,
                    share_percentage=participant.share_percentage,
                )
            )

        self.db.flush()

    def create_personal_recurring_expense(self, recurring_in: PersonalRecurringExpenseCreate, user_id: int):
        if recurring_in.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")

        self._validate_recurrence_fields(
            frequency=recurring_in.frequency,
            interval_count=recurring_in.interval_count,
            starts_on=recurring_in.starts_on,
            ends_on=recurring_in.ends_on,
            day_of_month=recurring_in.day_of_month,
            day_of_week=recurring_in.day_of_week,
        )
        self.category_service.validate_available_for_personal_expense(recurring_in.category_id, user_id)

        recurring_expense = RecurringExpense(
            user_id=user_id,
            group_id=None,
            title=recurring_in.title,
            amount=self._round_money(recurring_in.amount),
            currency=recurring_in.currency,
            category_id=recurring_in.category_id,
            split_type=None,
            frequency=recurring_in.frequency,
            interval_count=recurring_in.interval_count,
            day_of_month=recurring_in.day_of_month,
            day_of_week=recurring_in.day_of_week,
            starts_on=recurring_in.starts_on,
            ends_on=recurring_in.ends_on,
            next_due_on=recurring_in.starts_on,
            notes=recurring_in.notes,
            status=RecurringExpenseStatus.ACTIVE,
        )

        try:
            recurring_expense = self.recurring_repo.create(recurring_expense)
            self.recurring_repo.save_all()
            self.recurring_repo.refresh(recurring_expense)
            return recurring_expense
        except Exception:
            self.db.rollback()
            raise

    def create_group_recurring_expense(
        self,
        recurring_in: GroupRecurringExpenseCreate,
        group_id: int,
        user_id: int,
    ):
        group = self.group_service.get_group(group_id, user_id)

        if recurring_in.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")

        if recurring_in.currency != group.currency:
            raise HTTPException(status_code=400, detail="Recurring expense currency must match group currency")

        self._validate_recurrence_fields(
            frequency=recurring_in.frequency,
            interval_count=recurring_in.interval_count,
            starts_on=recurring_in.starts_on,
            ends_on=recurring_in.ends_on,
            day_of_month=recurring_in.day_of_month,
            day_of_week=recurring_in.day_of_week,
        )

        self.category_service.validate_available_for_group_expense(recurring_in.category_id, group_id)
        self._validate_group_participants(
            group_id=group_id,
            split_type=recurring_in.split_type,
            amount=recurring_in.amount,
            participants=recurring_in.participants,
        )

        recurring_expense = RecurringExpense(
            user_id=user_id,
            group_id=group_id,
            title=recurring_in.title,
            amount=self._round_money(recurring_in.amount),
            currency=recurring_in.currency,
            category_id=recurring_in.category_id,
            split_type=recurring_in.split_type,
            frequency=recurring_in.frequency,
            interval_count=recurring_in.interval_count,
            day_of_month=recurring_in.day_of_month,
            day_of_week=recurring_in.day_of_week,
            starts_on=recurring_in.starts_on,
            ends_on=recurring_in.ends_on,
            next_due_on=recurring_in.starts_on,
            notes=recurring_in.notes,
            status=RecurringExpenseStatus.ACTIVE,
        )

        try:
            recurring_expense = self.recurring_repo.create(recurring_expense)
            self._replace_participants(recurring_expense, recurring_in.participants)
            self.recurring_repo.save_all()
            self.recurring_repo.refresh(recurring_expense)
            return recurring_expense
        except Exception:
            self.db.rollback()
            raise

    def list_recurring_expenses(
        self,
        user_id: int,
        scope: RecurringScope,
        group_id: int | None,
        status: RecurringExpenseStatus | None,
        limit: int,
        offset: int,
    ):
        if scope not in ("all", "personal", "group"):
            raise HTTPException(status_code=400, detail="scope must be one of: all, personal, group")

        if scope == "personal" and group_id is not None:
            raise HTTPException(status_code=400, detail="group_id is not supported for personal scope")

        if group_id is not None:
            self.group_service.get_group(group_id, user_id)

        return self.recurring_repo.list_by_user(
            user_id=user_id,
            scope=scope,
            group_id=group_id,
            status=status,
            limit=limit,
            offset=offset,
        )

    def get_recurring_expense(self, recurring_expense_id: int, user_id: int):
        recurring_expense = self.recurring_repo.get_by_id(recurring_expense_id)
        if not recurring_expense:
            raise HTTPException(status_code=404, detail="Recurring expense not found")

        self._assert_series_access(recurring_expense, user_id)
        return recurring_expense

    def update_recurring_expense(
        self,
        recurring_expense_id: int,
        recurring_in: RecurringExpenseUpdate,
        user_id: int,
    ):
        recurring_expense = self.get_recurring_expense(recurring_expense_id, user_id)

        update_data = recurring_in.model_dump(exclude_unset=True)
        participants = update_data.pop("participants", None)

        next_frequency = update_data.get("frequency", recurring_expense.frequency)
        next_interval_count = update_data.get("interval_count", recurring_expense.interval_count)
        next_starts_on = update_data.get("starts_on", recurring_expense.starts_on)
        next_ends_on = update_data.get("ends_on", recurring_expense.ends_on)
        next_day_of_month = update_data.get("day_of_month", recurring_expense.day_of_month)
        next_day_of_week = update_data.get("day_of_week", recurring_expense.day_of_week)

        self._validate_recurrence_fields(
            frequency=next_frequency,
            interval_count=next_interval_count,
            starts_on=next_starts_on,
            ends_on=next_ends_on,
            day_of_month=next_day_of_month,
            day_of_week=next_day_of_week,
        )

        if "amount" in update_data and update_data["amount"] is not None and update_data["amount"] <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")

        if "category_id" in update_data and update_data["category_id"] is not None:
            if recurring_expense.group_id is None:
                self.category_service.validate_available_for_personal_expense(update_data["category_id"], user_id)
            else:
                self.category_service.validate_available_for_group_expense(
                    update_data["category_id"],
                    recurring_expense.group_id,
                )

        if recurring_expense.group_id is not None and "currency" in update_data and update_data["currency"] is not None:
            group = self.group_service.get_group(recurring_expense.group_id, user_id)
            if update_data["currency"] != group.currency:
                raise HTTPException(status_code=400, detail="Recurring expense currency must match group currency")

        if recurring_expense.group_id is None and participants is not None:
            raise HTTPException(status_code=400, detail="Participants are supported only for group recurring expenses")

        if recurring_expense.group_id is not None:
            next_amount = update_data.get("amount", recurring_expense.amount)
            next_split_type = update_data.get("split_type", recurring_expense.split_type)

            if participants is not None:
                self._validate_group_participants(
                    group_id=recurring_expense.group_id,
                    split_type=next_split_type,
                    amount=next_amount,
                    participants=participants,
                )

        for field, value in update_data.items():
            if field == "amount" and value is not None:
                setattr(recurring_expense, field, self._round_money(value))
            else:
                setattr(recurring_expense, field, value)

        if recurring_expense.next_due_on < recurring_expense.starts_on:
            recurring_expense.next_due_on = recurring_expense.starts_on

        if recurring_expense.ends_on is not None and recurring_expense.next_due_on > recurring_expense.ends_on:
            recurring_expense.status = RecurringExpenseStatus.ENDED

        if participants is not None:
            self._replace_participants(recurring_expense, participants)

        try:
            self.recurring_repo.save_all()
            self.recurring_repo.refresh(recurring_expense)
            return recurring_expense
        except Exception:
            self.db.rollback()
            raise

    def pause_recurring_expense(self, recurring_expense_id: int, user_id: int):
        recurring_expense = self.get_recurring_expense(recurring_expense_id, user_id)
        recurring_expense.status = RecurringExpenseStatus.PAUSED
        self.recurring_repo.save_all()
        self.recurring_repo.refresh(recurring_expense)
        return recurring_expense

    def resume_recurring_expense(self, recurring_expense_id: int, user_id: int):
        recurring_expense = self.get_recurring_expense(recurring_expense_id, user_id)

        if recurring_expense.ends_on is not None and recurring_expense.next_due_on > recurring_expense.ends_on:
            raise HTTPException(status_code=400, detail="Recurring expense is already past end date")

        recurring_expense.status = RecurringExpenseStatus.ACTIVE
        self.recurring_repo.save_all()
        self.recurring_repo.refresh(recurring_expense)
        return recurring_expense

    def archive_recurring_expense(self, recurring_expense_id: int, user_id: int):
        recurring_expense = self.get_recurring_expense(recurring_expense_id, user_id)
        recurring_expense.status = RecurringExpenseStatus.ARCHIVED
        self.recurring_repo.save_all()
        self.recurring_repo.refresh(recurring_expense)
        return recurring_expense

    def delete_recurring_expense(self, recurring_expense_id: int, user_id: int):
        recurring_expense = self.get_recurring_expense(recurring_expense_id, user_id)
        has_occurrences = (
            self.db.query(Expense.id)
            .filter(Expense.recurring_expense_id == recurring_expense_id)
            .first()
            is not None
        )
        if has_occurrences:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete recurring expense with existing occurrences",
            )
        self.recurring_repo.delete(recurring_expense)
        self.recurring_repo.save_all()

    def generate_for_recurring_expense(
        self,
        recurring_expense_id: int,
        user_id: int,
        up_to_date: date | None = None,
    ):
        recurring_expense = self.get_recurring_expense(recurring_expense_id, user_id)
        if recurring_expense.status != RecurringExpenseStatus.ACTIVE:
            raise HTTPException(status_code=400, detail="Only active recurring expenses can be generated")

        target_date = up_to_date or date.today()
        if target_date < recurring_expense.next_due_on:
            return {
                "processed_series_count": 1,
                "generated_count": 0,
                "skipped_existing_count": 0,
                "failed_series_count": 0,
            }

        try:
            generated_count, skipped_existing_count = self._generate_for_series_until(recurring_expense, target_date)
            recurring_expense.last_error = None
            self.recurring_repo.save_all()
            return {
                "processed_series_count": 1,
                "generated_count": generated_count,
                "skipped_existing_count": skipped_existing_count,
                "failed_series_count": 0,
            }
        except Exception as exc:
            self.db.rollback()
            recurring_expense = self.recurring_repo.get_by_id(recurring_expense_id)
            if recurring_expense and recurring_expense.user_id == user_id:
                recurring_expense.last_error = str(exc)[:1000]
                recurring_expense.status = RecurringExpenseStatus.PAUSED
                self.recurring_repo.save_all()
            raise

    def generate_due_expenses(
        self,
        user_id: int | None,
        up_to_date: date | None = None,
        limit: int = 200,
    ):
        target_date = up_to_date or date.today()

        due_series = self.recurring_repo.get_due_series(
            due_on=target_date,
            limit=limit,
            user_id=user_id,
        )

        processed_series_count = 0
        generated_count = 0
        skipped_existing_count = 0
        failed_series_count = 0

        for series in due_series:
            processed_series_count += 1
            try:
                generated, skipped = self._generate_for_series_until(series, target_date)
                series.last_error = None
                self.recurring_repo.save_all()
                generated_count += generated
                skipped_existing_count += skipped
            except Exception as exc:
                self.db.rollback()
                failed_series_count += 1

                failed_series = self.recurring_repo.get_by_id(series.id)
                if failed_series is not None:
                    failed_series.last_error = str(exc)[:1000]
                    failed_series.status = RecurringExpenseStatus.PAUSED
                    self.recurring_repo.save_all()

        return {
            "processed_series_count": processed_series_count,
            "generated_count": generated_count,
            "skipped_existing_count": skipped_existing_count,
            "failed_series_count": failed_series_count,
        }

    def _forecast_user_amount(self, recurring_expense: RecurringExpense, user_id: int) -> Decimal:
        if recurring_expense.group_id is None:
            return self._round_money(recurring_expense.amount)

        participants = list(recurring_expense.participants)
        if not participants:
            return Decimal("0.00")

        participant_map = {participant.user_id: participant for participant in participants}
        current_participant = participant_map.get(user_id)

        if current_participant is None:
            return Decimal("0.00")

        if current_participant.share_amount is not None:
            return self._round_money(current_participant.share_amount)

        if current_participant.share_percentage is not None:
            value = (Decimal(recurring_expense.amount) * Decimal(current_participant.share_percentage)) / Decimal("100")
            return self._round_money(value)

        equal_shares = self._build_equal_shares(
            amount=Decimal(recurring_expense.amount),
            user_ids=[participant.user_id for participant in participants],
        )
        for participant_user_id, share_amount in equal_shares:
            if participant_user_id == user_id:
                return self._round_money(share_amount)

        return Decimal("0.00")

    def get_forecast(
        self,
        user_id: int,
        date_from: date,
        date_to: date,
        scope: RecurringScope,
        group_id: int | None,
    ):
        if date_from > date_to:
            raise HTTPException(status_code=400, detail="date_from cannot be greater than date_to")

        if scope not in ("all", "personal", "group"):
            raise HTTPException(status_code=400, detail="scope must be one of: all, personal, group")

        if scope == "personal" and group_id is not None:
            raise HTTPException(status_code=400, detail="group_id is not supported for personal scope")

        if group_id is not None:
            self.group_service.get_group(group_id, user_id)

        recurring_expenses = self.recurring_repo.list_by_user(
            user_id=user_id,
            scope=scope,
            group_id=group_id,
            status=RecurringExpenseStatus.ACTIVE,
            limit=500,
            offset=0,
        )

        items = []
        for recurring_expense in recurring_expenses:
            occurrence = recurring_expense.next_due_on

            while (
                occurrence < date_from
                and (recurring_expense.ends_on is None or occurrence <= recurring_expense.ends_on)
            ):
                occurrence = self._calculate_next_due_date(recurring_expense, occurrence)

            while (
                occurrence <= date_to
                and (recurring_expense.ends_on is None or occurrence <= recurring_expense.ends_on)
            ):
                items.append(
                    {
                        "recurring_expense_id": recurring_expense.id,
                        "title": recurring_expense.title,
                        "scope": "group" if recurring_expense.group_id is not None else "personal",
                        "occurrence_date": occurrence,
                        "currency": recurring_expense.currency,
                        "category_id": recurring_expense.category_id,
                        "group_id": recurring_expense.group_id,
                        "total_amount": self._round_money(recurring_expense.amount),
                        "user_amount": self._forecast_user_amount(recurring_expense, user_id),
                    }
                )

                occurrence = self._calculate_next_due_date(recurring_expense, occurrence)

        items.sort(key=lambda item: (item["occurrence_date"], item["recurring_expense_id"]))

        return {
            "total_count": len(items),
            "items": items,
        }