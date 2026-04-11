from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from itertools import combinations
import random
import re
from typing import Sequence
from uuid import uuid4

from sqlalchemy.orm import Session

from app.enums import (
    CurrencyEnum,
    GroupMemberRole,
    GroupMemberStatus,
    GroupStatus,
    RecurrenceFrequency,
    RecurringExpenseStatus,
    SplitType,
)
from app.models import (
    Category,
    Contact,
    Expense,
    ExpenseShare,
    Group,
    GroupMember,
    RecurringExpense,
    RecurringExpenseParticipant,
    User,
)
from app.utils.auth_utils import get_password_hash


CENTS = Decimal("0.01")


@dataclass(frozen=True)
class SeederConfig:
    users_count: int
    groups_count: int
    personal_expenses_count: int
    group_expenses_count: int
    personal_recurring_expenses_count: int = 0
    group_recurring_expenses_count: int = 0
    max_personal_recurring_per_user: int = 3
    max_group_recurring_per_group: int = 3
    password: str = "password"
    edge_case_ratio: float = 0.12
    max_days_back: int = 730
    seed: int | None = None
    run_tag: str | None = None


@dataclass
class SeederResult:
    run_tag: str
    created_users: int = 0
    created_groups: int = 0
    created_group_members: int = 0
    created_contacts: int = 0
    created_personal_expenses: int = 0
    created_group_expenses: int = 0
    created_expense_shares: int = 0
    created_personal_recurring_expenses: int = 0
    created_group_recurring_expenses: int = 0
    created_recurring_participants: int = 0


@dataclass(frozen=True)
class GroupContext:
    id: int
    currency: CurrencyEnum
    status: GroupStatus
    active_member_ids: tuple[int, ...]


@dataclass(frozen=True)
class RecurrenceSpec:
    frequency: RecurrenceFrequency
    interval_count: int
    day_of_month: int | None
    day_of_week: int | None
    starts_on: date
    ends_on: date | None
    next_due_on: date
    status: RecurringExpenseStatus


class TestDataSeeder:
    def __init__(self, db: Session, config: SeederConfig):
        self.db = db
        self.config = config
        self.rng = random.Random(config.seed)
        self.run_tag = self._resolve_run_tag(config.run_tag)

    @staticmethod
    def _resolve_run_tag(run_tag: str | None) -> str:
        raw = run_tag or f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid4().hex[:6]}"
        sanitized = re.sub(r"[^a-zA-Z0-9_-]", "_", raw).strip("_")
        return sanitized or f"run_{uuid4().hex[:8]}"

    def seed_all(self) -> SeederResult:
        result = SeederResult(run_tag=self.run_tag)

        categories = self._get_default_categories()
        users = self._create_users(self.config.users_count, self.config.password, result)
        groups = self._create_groups(self.config.groups_count, users, result)
        self._ensure_group_contacts(groups, result)

        self._create_personal_recurring_expenses(
            self.config.personal_recurring_expenses_count,
            users,
            categories,
            result,
        )
        self._create_group_recurring_expenses(
            self.config.group_recurring_expenses_count,
            groups,
            categories,
            result,
        )

        self._create_personal_expenses(self.config.personal_expenses_count, users, categories, result)
        self._create_group_expenses(self.config.group_expenses_count, groups, categories, result)

        return result

    def _ensure_group_contacts(self, groups: Sequence[GroupContext], result: SeederResult) -> None:
        if not groups:
            return

        relevant_user_ids = {
            user_id
            for group in groups
            for user_id in group.active_member_ids
        }
        if len(relevant_user_ids) < 2:
            return

        existing_directed_pairs = {
            (user_id, contact_id)
            for user_id, contact_id in (
                self.db.query(Contact.user_id, Contact.contact_id)
                .filter(
                    Contact.user_id.in_(relevant_user_ids),
                    Contact.contact_id.in_(relevant_user_ids),
                )
                .all()
            )
        }

        batch: list[Contact] = []
        batch_size = 500

        for group in groups:
            member_ids = sorted(set(group.active_member_ids))
            if len(member_ids) < 2:
                continue

            for user1_id, user2_id in combinations(member_ids, 2):
                if (user1_id, user2_id) not in existing_directed_pairs:
                    batch.append(Contact(user_id=user1_id, contact_id=user2_id))
                    existing_directed_pairs.add((user1_id, user2_id))
                    result.created_contacts += 1

                if (user2_id, user1_id) not in existing_directed_pairs:
                    batch.append(Contact(user_id=user2_id, contact_id=user1_id))
                    existing_directed_pairs.add((user2_id, user1_id))
                    result.created_contacts += 1

                if len(batch) >= batch_size:
                    self.db.add_all(batch)
                    self.db.flush()
                    self.db.commit()
                    batch.clear()

        if batch:
            self.db.add_all(batch)
            self.db.flush()
            self.db.commit()

    def _get_default_categories(self) -> list[Category]:
        categories = (
            self.db.query(Category)
            .filter(Category.user_id.is_(None), Category.group_id.is_(None))
            .all()
        )

        if not categories:
            raise ValueError(
                "No default categories found. Run API startup seeding first (seed_default_categories)."
            )

        return categories

    def _create_users(self, count: int, password: str, result: SeederResult) -> list[User]:
        if count <= 0:
            return []

        hashed_password = get_password_hash(password)
        users: list[User] = []
        batch_size = 200

        for index in range(1, count + 1):
            suffix = self.rng.randint(1000, 9999)
            username = f"seed_u{index}_{suffix}_{uuid4().hex[:6]}"
            email = f"{username}@seed-expenses.dev"

            user = User(
                email=email,
                username=username,
                hashed_password=hashed_password,
                is_active=True,
            )
            self.db.add(user)
            users.append(user)

            if index % batch_size == 0:
                self.db.flush()
                self.db.commit()

        self.db.flush()
        self.db.commit()

        result.created_users += len(users)
        return users

    def _create_groups(self, count: int, users: Sequence[User], result: SeederResult) -> list[GroupContext]:
        if count <= 0 or len(users) < 2:
            return []

        group_contexts: list[GroupContext] = []
        batch_size = 75

        for index in range(1, count + 1):
            creator = self.rng.choice(users)
            currency = self._random_group_currency()
            group = Group(
                name=f"seed_group_{index}_{self.rng.randint(1000, 9999)}_{uuid4().hex[:4]}",
                description=self._random_group_description(index),
                status=GroupStatus.ACTIVE,
                currency=currency,
                created_by=creator.id,
            )
            self.db.add(group)
            self.db.flush()

            creator_member = GroupMember(
                group_id=group.id,
                user_id=creator.id,
                role=GroupMemberRole.ADMIN,
                status=GroupMemberStatus.ACTIVE,
            )
            self.db.add(creator_member)

            active_member_ids = {creator.id}
            member_targets = self._random_group_size(total_users=len(users))

            candidates = [user for user in users if user.id != creator.id]
            self.rng.shuffle(candidates)
            selected_members = candidates[: max(0, member_targets - 1)]

            for member in selected_members:
                role = GroupMemberRole.ADMIN if self.rng.random() < 0.08 else GroupMemberRole.MEMBER
                status = (
                    GroupMemberStatus.LEFT
                    if self.rng.random() < (self.config.edge_case_ratio * 0.55)
                    else GroupMemberStatus.ACTIVE
                )
                self.db.add(
                    GroupMember(
                        group_id=group.id,
                        user_id=member.id,
                        role=role,
                        status=status,
                    )
                )
                if status == GroupMemberStatus.ACTIVE:
                    active_member_ids.add(member.id)
                result.created_group_members += 1

            # Keep a small archived sample for edge-case testing while preserving realistic active majority.
            if self.rng.random() < self.config.edge_case_ratio:
                group.status = GroupStatus.ARCHIVED

            group_contexts.append(
                GroupContext(
                    id=group.id,
                    currency=currency,
                    status=group.status,
                    active_member_ids=tuple(sorted(active_member_ids)),
                )
            )

            result.created_groups += 1
            result.created_group_members += 1

            if index % batch_size == 0:
                self.db.flush()
                self.db.commit()

        self.db.flush()
        self.db.commit()

        return group_contexts

    def _create_personal_expenses(
        self,
        count: int,
        users: Sequence[User],
        categories: Sequence[Category],
        result: SeederResult,
    ) -> None:
        if count <= 0 or not users or not categories:
            return

        now = datetime.now()
        batch_size = 1000

        for index in range(1, count + 1):
            user = self.rng.choice(users)
            category = self.rng.choice(categories)
            amount = self._random_amount_cents()

            expense = Expense(
                user_id=user.id,
                group_id=None,
                title=self._build_personal_expense_title(category.name),
                amount=self._cents_to_amount(amount),
                currency=self._random_personal_currency(),
                split_type=None,
                category_id=category.id,
                expense_date=self._random_expense_date(now),
                notes=self._random_notes(),
                receipt_image_url=None,
                receipt_text=None,
            )
            self.db.add(expense)
            result.created_personal_expenses += 1

            if index % batch_size == 0:
                self.db.flush()
                self.db.commit()

        self.db.flush()
        self.db.commit()

    def _create_personal_recurring_expenses(
        self,
        count: int,
        users: Sequence[User],
        categories: Sequence[Category],
        result: SeederResult,
    ) -> None:
        if count <= 0 or not users or not categories:
            return

        per_user_limit = max(1, self.config.max_personal_recurring_per_user)
        max_possible = len(users) * per_user_limit
        target_count = min(count, max_possible)
        user_recurring_count = {user.id: 0 for user in users}

        today = date.today()
        batch_size = 300

        for index in range(1, target_count + 1):
            eligible_users = [user for user in users if user_recurring_count[user.id] < per_user_limit]
            if not eligible_users:
                break

            user = self.rng.choice(eligible_users)
            category = self.rng.choice(categories)
            recurrence = self._build_recurrence_spec(today)

            recurring_expense = RecurringExpense(
                user_id=user.id,
                group_id=None,
                title=self._build_personal_recurring_title(category.name),
                amount=self._cents_to_amount(self._random_amount_cents()),
                currency=self._random_personal_currency(),
                category_id=category.id,
                split_type=None,
                frequency=recurrence.frequency,
                interval_count=recurrence.interval_count,
                day_of_month=recurrence.day_of_month,
                day_of_week=recurrence.day_of_week,
                starts_on=recurrence.starts_on,
                ends_on=recurrence.ends_on,
                next_due_on=recurrence.next_due_on,
                notes=self._random_notes(),
                status=recurrence.status,
            )
            self.db.add(recurring_expense)
            result.created_personal_recurring_expenses += 1
            user_recurring_count[user.id] += 1

            if index % batch_size == 0:
                self.db.flush()
                self.db.commit()

        self.db.flush()
        self.db.commit()

    def _create_group_recurring_expenses(
        self,
        count: int,
        groups: Sequence[GroupContext],
        categories: Sequence[Category],
        result: SeederResult,
    ) -> None:
        if count <= 0 or not groups or not categories:
            return

        per_group_limit = max(1, self.config.max_group_recurring_per_group)

        today = date.today()
        batch_size = 200

        eligible_groups = [group for group in groups if group.active_member_ids]
        active_groups = [group for group in eligible_groups if group.status == GroupStatus.ACTIVE]
        group_recurring_count = {group.id: 0 for group in eligible_groups}
        max_possible = len(eligible_groups) * per_group_limit
        target_count = min(count, max_possible)

        if not eligible_groups:
            return

        for index in range(1, target_count + 1):
            eligible_by_limit = [group for group in eligible_groups if group_recurring_count[group.id] < per_group_limit]
            if not eligible_by_limit:
                break

            use_archived = self.rng.random() < (self.config.edge_case_ratio * 0.5)
            source_pool = eligible_by_limit
            if not use_archived and active_groups:
                active_eligible = [group for group in active_groups if group_recurring_count[group.id] < per_group_limit]
                if active_eligible:
                    source_pool = active_eligible

            group = self.rng.choice(source_pool)
            member_ids = list(group.active_member_ids)
            payer_id = self.rng.choice(member_ids)
            split_type = self._random_split_type()

            participant_ids = self._select_participants(member_ids, payer_id)
            amount_cents = max(self._random_amount_cents(), len(participant_ids))
            shares_cents = self._build_share_cents(amount_cents, len(participant_ids), split_type)

            category = self.rng.choice(categories)
            recurrence = self._build_recurrence_spec(today)
            recurring_expense = RecurringExpense(
                user_id=payer_id,
                group_id=group.id,
                title=self._build_group_recurring_title(category.name),
                amount=self._cents_to_amount(amount_cents),
                currency=group.currency,
                category_id=category.id,
                split_type=split_type,
                frequency=recurrence.frequency,
                interval_count=recurrence.interval_count,
                day_of_month=recurrence.day_of_month,
                day_of_week=recurrence.day_of_week,
                starts_on=recurrence.starts_on,
                ends_on=recurrence.ends_on,
                next_due_on=recurrence.next_due_on,
                notes=self._random_notes(),
                status=recurrence.status,
            )
            self.db.add(recurring_expense)
            self.db.flush()

            participants = self._build_recurring_participants(
                recurring_expense_id=recurring_expense.id,
                participant_ids=participant_ids,
                shares_cents=shares_cents,
                total_amount_cents=amount_cents,
                split_type=split_type,
            )
            self.db.add_all(participants)

            result.created_group_recurring_expenses += 1
            result.created_recurring_participants += len(participants)
            group_recurring_count[group.id] += 1

            if index % batch_size == 0:
                self.db.flush()
                self.db.commit()

        self.db.flush()
        self.db.commit()

    def _create_group_expenses(
        self,
        count: int,
        groups: Sequence[GroupContext],
        categories: Sequence[Category],
        result: SeederResult,
    ) -> None:
        if count <= 0 or not groups or not categories:
            return

        now = datetime.now()
        batch_size = 500

        eligible_groups = [group for group in groups if group.active_member_ids]
        active_groups = [group for group in eligible_groups if group.status == GroupStatus.ACTIVE]

        if not eligible_groups:
            return

        for index in range(1, count + 1):
            use_archived = self.rng.random() < (self.config.edge_case_ratio * 0.5)

            source_pool = eligible_groups
            if not use_archived and active_groups:
                source_pool = active_groups

            group = self.rng.choice(source_pool)
            member_ids = list(group.active_member_ids)
            payer_id = self.rng.choice(member_ids)
            split_type = self._random_split_type()

            participants = self._select_participants(member_ids, payer_id)
            amount_cents = max(self._random_amount_cents(), len(participants))
            shares_cents = self._build_share_cents(amount_cents, len(participants), split_type)

            category = self.rng.choice(categories)
            expense = Expense(
                group_id=group.id,
                user_id=payer_id,
                title=self._build_group_expense_title(category.name),
                amount=self._cents_to_amount(amount_cents),
                currency=group.currency,
                split_type=split_type,
                category_id=category.id,
                expense_date=self._random_expense_date(now),
                notes=self._random_notes(),
                receipt_image_url=None,
                receipt_text=None,
            )
            self.db.add(expense)
            self.db.flush()

            for user_id, share_cents in zip(participants, shares_cents, strict=True):
                self.db.add(
                    ExpenseShare(
                        expense_id=expense.id,
                        user_id=user_id,
                        share_amount=self._cents_to_amount(share_cents),
                    )
                )
                result.created_expense_shares += 1

            result.created_group_expenses += 1

            if index % batch_size == 0:
                self.db.flush()
                self.db.commit()

        self.db.flush()
        self.db.commit()

    def _random_group_currency(self) -> CurrencyEnum:
        return self.rng.choices(
            population=[CurrencyEnum.PLN, CurrencyEnum.EUR, CurrencyEnum.USD, CurrencyEnum.GBP],
            weights=[0.58, 0.24, 0.14, 0.04],
            k=1,
        )[0]

    def _random_personal_currency(self) -> CurrencyEnum:
        return self.rng.choices(
            population=[CurrencyEnum.PLN, CurrencyEnum.EUR, CurrencyEnum.USD, CurrencyEnum.GBP],
            weights=[0.66, 0.18, 0.12, 0.04],
            k=1,
        )[0]

    def _random_group_size(self, total_users: int) -> int:
        roll = self.rng.random()
        if roll < 0.55:
            size = self.rng.randint(2, 4)
        elif roll < 0.9:
            size = self.rng.randint(5, 8)
        else:
            size = self.rng.randint(9, 12)
        return min(size, total_users)

    def _random_split_type(self) -> SplitType:
        return self.rng.choices(
            population=[SplitType.EQUAL, SplitType.EXACT, SplitType.PERCENT],
            weights=[0.58, 0.27, 0.15],
            k=1,
        )[0]

    def _random_recurrence_frequency(self) -> RecurrenceFrequency:
        return self.rng.choices(
            population=[
                RecurrenceFrequency.DAILY,
                RecurrenceFrequency.WEEKLY,
                RecurrenceFrequency.MONTHLY,
                RecurrenceFrequency.QUARTERLY,
                RecurrenceFrequency.YEARLY,
            ],
            weights=[0.17, 0.28, 0.37, 0.11, 0.07],
            k=1,
        )[0]

    def _build_recurrence_spec(self, today: date) -> RecurrenceSpec:
        frequency = self._random_recurrence_frequency()

        interval_ranges = {
            RecurrenceFrequency.DAILY: (1, 3),
            RecurrenceFrequency.WEEKLY: (1, 2),
            RecurrenceFrequency.MONTHLY: (1, 3),
            RecurrenceFrequency.QUARTERLY: (1, 2),
            RecurrenceFrequency.YEARLY: (1, 1),
        }
        min_interval, max_interval = interval_ranges[frequency]
        interval_count = self.rng.randint(min_interval, max_interval)

        status = RecurringExpenseStatus.ACTIVE
        status_roll = self.rng.random()
        if status_roll < (self.config.edge_case_ratio * 0.28):
            status = RecurringExpenseStatus.PAUSED
        elif status_roll < (self.config.edge_case_ratio * 0.43):
            status = RecurringExpenseStatus.ARCHIVED
        elif status_roll < (self.config.edge_case_ratio * 0.55):
            status = RecurringExpenseStatus.ENDED

        if status == RecurringExpenseStatus.ENDED:
            starts_on = today - timedelta(days=self.rng.randint(120, 540))
            ends_on = starts_on + timedelta(days=self.rng.randint(30, 210))
            if ends_on >= today:
                ends_on = today - timedelta(days=self.rng.randint(1, 45))
            next_due_on = ends_on + timedelta(days=1)
        else:
            # Keep next_due close to current date/future to avoid massive backlog generation on scheduler startup.
            if self.rng.random() < 0.2:
                next_due_on = today - timedelta(days=self.rng.randint(0, 2))
            else:
                next_due_on = today + timedelta(days=self.rng.randint(0, 28))
            starts_on = next_due_on - timedelta(days=self.rng.randint(0, 20))
            ends_on = None
            if self.rng.random() < (self.config.edge_case_ratio * 0.4):
                ends_on = next_due_on + timedelta(days=self.rng.randint(30, 240))

        day_of_month = None
        day_of_week = None
        if frequency == RecurrenceFrequency.WEEKLY:
            day_of_week = starts_on.weekday()
        elif frequency in (
            RecurrenceFrequency.MONTHLY,
            RecurrenceFrequency.QUARTERLY,
            RecurrenceFrequency.YEARLY,
        ):
            day_of_month = starts_on.day

        return RecurrenceSpec(
            frequency=frequency,
            interval_count=interval_count,
            day_of_month=day_of_month,
            day_of_week=day_of_week,
            starts_on=starts_on,
            ends_on=ends_on,
            next_due_on=starts_on,
            status=status,
        )

    def _select_participants(self, member_ids: list[int], payer_id: int) -> list[int]:
        if len(member_ids) == 1:
            return [payer_id]

        max_participants = min(6, len(member_ids))

        if self.rng.random() < (self.config.edge_case_ratio * 0.4):
            target_count = 1
        else:
            target_count = self.rng.randint(2, max_participants)

        other_candidates = [member_id for member_id in member_ids if member_id != payer_id]
        self.rng.shuffle(other_candidates)

        selected = [payer_id]
        selected.extend(other_candidates[: max(0, target_count - 1)])

        return selected

    def _build_share_cents(self, amount_cents: int, size: int, split_type: SplitType) -> list[int]:
        if size <= 0:
            raise ValueError("Split size must be greater than 0")

        if size == 1:
            return [amount_cents]

        if split_type == SplitType.EQUAL:
            base = amount_cents // size
            shares = [base for _ in range(size)]
            remainder = amount_cents - (base * size)
            for index in range(remainder):
                shares[index] += 1
            return shares

        # For exact/percent split types we keep random positive shares that sum to total amount.
        cuts = sorted(self.rng.sample(range(1, amount_cents), size - 1))
        points = [0, *cuts, amount_cents]
        shares = [points[index + 1] - points[index] for index in range(size)]
        return shares

    def _shares_to_percentages(self, shares_cents: list[int], total_amount_cents: int) -> list[Decimal]:
        basis_points: list[int] = []
        fractions: list[tuple[int, int]] = []

        for index, share_cents in enumerate(shares_cents):
            scaled = share_cents * 10000
            base = scaled // total_amount_cents
            remainder = scaled % total_amount_cents
            basis_points.append(base)
            fractions.append((index, remainder))

        remainder_points = 10000 - sum(basis_points)
        fractions.sort(key=lambda item: item[1], reverse=True)

        for index in range(remainder_points):
            target = fractions[index % len(fractions)][0]
            basis_points[target] += 1

        return [Decimal(points) / Decimal("100") for points in basis_points]

    def _build_recurring_participants(
        self,
        recurring_expense_id: int,
        participant_ids: list[int],
        shares_cents: list[int],
        total_amount_cents: int,
        split_type: SplitType,
    ) -> list[RecurringExpenseParticipant]:
        participants: list[RecurringExpenseParticipant] = []

        if split_type == SplitType.EQUAL:
            for user_id in participant_ids:
                participants.append(
                    RecurringExpenseParticipant(
                        recurring_expense_id=recurring_expense_id,
                        user_id=user_id,
                        share_amount=None,
                        share_percentage=None,
                    )
                )
            return participants

        if split_type == SplitType.PERCENT and self.rng.random() < 0.7:
            percentages = self._shares_to_percentages(shares_cents, total_amount_cents)
            for user_id, percentage in zip(participant_ids, percentages, strict=True):
                participants.append(
                    RecurringExpenseParticipant(
                        recurring_expense_id=recurring_expense_id,
                        user_id=user_id,
                        share_amount=None,
                        share_percentage=percentage,
                    )
                )
            return participants

        for user_id, share_cents in zip(participant_ids, shares_cents, strict=True):
            participants.append(
                RecurringExpenseParticipant(
                    recurring_expense_id=recurring_expense_id,
                    user_id=user_id,
                    share_amount=self._cents_to_amount(share_cents),
                    share_percentage=None,
                )
            )
        return participants

    def _random_amount_cents(self) -> int:
        bucket = self.rng.random()
        if bucket < 0.72:
            amount = self.rng.uniform(4.0, 220.0)
        elif bucket < 0.95:
            amount = self.rng.uniform(220.0, 1400.0)
        else:
            amount = self.rng.uniform(1400.0, 5200.0)

        cents = int(Decimal(str(round(amount, 2))) * 100)
        return max(cents, 1)

    def _random_expense_date(self, now: datetime) -> datetime:
        days_back = self._random_days_back(self.config.max_days_back)
        seconds_back = self.rng.randint(0, 86399)
        return now - timedelta(days=days_back, seconds=seconds_back)

    def _random_days_back(self, max_days_back: int) -> int:
        max_days_back = max(1, max_days_back)
        bucket = self.rng.random()

        if bucket < 0.24:
            low, high = 0, min(7, max_days_back)
        elif bucket < 0.52:
            low, high = min(8, max_days_back), min(30, max_days_back)
        elif bucket < 0.84:
            low, high = min(31, max_days_back), min(180, max_days_back)
        else:
            low, high = min(181, max_days_back), max_days_back

        if low > high:
            low = 0

        return self.rng.randint(low, high)

    @staticmethod
    def _build_personal_expense_title(category_name: str) -> str:
        normalized = category_name.replace("_", " ").strip().title()
        return f"Personal {normalized}"

    @staticmethod
    def _build_group_expense_title(category_name: str) -> str:
        normalized = category_name.replace("_", " ").strip().title()
        return f"Group {normalized}"

    @staticmethod
    def _build_personal_recurring_title(category_name: str) -> str:
        normalized = category_name.replace("_", " ").strip().title()
        return f"Recurring Personal {normalized}"

    @staticmethod
    def _build_group_recurring_title(category_name: str) -> str:
        normalized = category_name.replace("_", " ").strip().title()
        return f"Recurring Group {normalized}"

    def _random_group_description(self, index: int) -> str:
        templates = [
            "Shared household budget",
            "Trip planning expenses",
            "Weekend food and activities",
            "Office team expenses",
            "Long-term project budget",
        ]
        return f"{self.rng.choice(templates)} #{index}"

    def _random_notes(self) -> str | None:
        if self.rng.random() > 0.32:
            return None

        notes = [
            "Imported from test data seeder.",
            "Synthetic data for pagination checks.",
            "UI load testing record.",
            "Generated for summary trends coverage.",
        ]
        return self.rng.choice(notes)

    @staticmethod
    def _cents_to_amount(cents: int) -> Decimal:
        return (Decimal(cents) / 100).quantize(CENTS)
