import logging
from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.enums import (
    BudgetAllocationStrategy,
    BudgetPeriodType,
    BudgetPoolType,
    BudgetStatus,
    CategorySection,
    CurrencyEnum,
    OverspendingStrategy,
)
from app.models import BudgetPlan, BudgetPool, BudgetRollover
from app.repositories import BudgetRepository, IncomeRepository, SavingsGoalRepository
from app.schemas import BudgetPlanCreate, BudgetPlanUpdate, BudgetPoolCreate, BudgetPoolUpdate

from .category_service import CategoryService


logger = logging.getLogger(__name__)


class BudgetService:
    def __init__(self, db: Session):
        self.budget_repo = BudgetRepository(db)
        self.income_repo = IncomeRepository(db)
        self.goal_repo = SavingsGoalRepository(db)
        self.category_service = CategoryService(db)
        self.settings = get_settings()

    @staticmethod
    def _round_money(value: Decimal | int | float) -> Decimal:
        return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @staticmethod
    def _to_datetime_range(period_start: date, period_end: date) -> tuple[datetime, datetime]:
        return (datetime.combine(period_start, time.min), datetime.combine(period_end, time.max))

    def _validate_budget_period(self, period_type: BudgetPeriodType, period_start: date, period_end: date):
        if period_start > period_end:
            raise HTTPException(status_code=400, detail="period_start cannot be greater than period_end")

        if period_type == BudgetPeriodType.WEEKLY:
            duration_days = (period_end - period_start).days + 1
            if duration_days != 7:
                raise HTTPException(status_code=400, detail="Weekly budget period must have exactly 7 days")

        if period_type == BudgetPeriodType.MONTHLY:
            if period_start.day != 1:
                raise HTTPException(status_code=400, detail="Monthly budget period must start on first day of month")

            last_day = monthrange(period_start.year, period_start.month)[1]
            expected_end = date(period_start.year, period_start.month, last_day)
            if period_end != expected_end:
                raise HTTPException(status_code=400, detail="Monthly budget period must end on last day of month")

    def _next_period_bounds(self, period_type: BudgetPeriodType, period_end: date) -> tuple[date, date]:
        if period_type == BudgetPeriodType.WEEKLY:
            next_start = period_end + timedelta(days=1)
            next_end = next_start + timedelta(days=6)
            return next_start, next_end

        if period_type == BudgetPeriodType.MONTHLY:
            if period_end.month == 12:
                next_start = date(period_end.year + 1, 1, 1)
            else:
                next_start = date(period_end.year, period_end.month + 1, 1)

            next_last_day = monthrange(next_start.year, next_start.month)[1]
            next_end = date(next_start.year, next_start.month, next_last_day)
            return next_start, next_end

        raise HTTPException(status_code=400, detail="Unsupported budget period type")

    def _compute_pool_rollover_amount(self, pool: BudgetPool) -> Decimal:
        remaining_amount = self._round_money(pool.remaining_amount or 0)

        if not pool.rollover_enabled:
            return Decimal("0.00")

        if remaining_amount < 0 and not pool.rollover_negative_enabled:
            return Decimal("0.00")

        return remaining_amount

    def _validate_pool_payload(self, pool_in: BudgetPoolCreate, user_id: int):
        if pool_in.target_value <= 0:
            raise HTTPException(status_code=400, detail="Pool target value must be greater than 0")

        if pool_in.alert_threshold <= 0 or pool_in.alert_threshold > 100:
            raise HTTPException(status_code=400, detail="Pool alert threshold must be in range (0, 100]")

        if pool_in.pool_type == BudgetPoolType.PERCENT_INCOME and pool_in.target_value > 100:
            raise HTTPException(status_code=400, detail="Percent pool target cannot be greater than 100")

        self.category_service.validate_available_for_personal_expense(pool_in.category_id, user_id)

    def _validate_pool_mix(self, pools: list[BudgetPoolCreate], income_target: Decimal | None):
        percent_sum = Decimal("0")
        fixed_sum = Decimal("0")

        for pool in pools:
            if pool.pool_type == BudgetPoolType.PERCENT_INCOME:
                percent_sum += Decimal(pool.target_value)
            else:
                fixed_sum += Decimal(pool.target_value)

        if percent_sum > Decimal("100"):
            raise HTTPException(status_code=400, detail="Percent pools total cannot exceed 100")

        if income_target is not None and fixed_sum > Decimal(income_target):
            raise HTTPException(status_code=400, detail="Fixed pools total cannot exceed income_target")

    def _select_zero_based_pool_for_residual(self, budget: BudgetPlan) -> BudgetPool | None:
        if not budget.pools:
            return None

        for pool in budget.pools:
            if pool.category and pool.category.section == CategorySection.FINANCE:
                return pool

        return budget.pools[0]

    def _build_pool_allocation_map(self, budget: BudgetPlan, income_total: Decimal) -> dict[int, Decimal]:
        allocations: dict[int, Decimal] = {}

        for pool in budget.pools:
            if pool.pool_type == BudgetPoolType.PERCENT_INCOME:
                allocated = self._round_money((income_total * Decimal(pool.target_value)) / Decimal("100"))
            else:
                allocated = self._round_money(Decimal(pool.target_value))

            allocations[pool.id] = allocated

        if budget.allocation_strategy == BudgetAllocationStrategy.ZERO_BASED and allocations:
            total_allocated = self._round_money(sum(allocations.values(), Decimal("0")))
            residual = self._round_money(income_total - total_allocated)

            if residual != Decimal("0"):
                residual_pool = self._select_zero_based_pool_for_residual(budget)
                if residual_pool:
                    allocations[residual_pool.id] = self._round_money(allocations[residual_pool.id] + residual)

        return allocations

    def _auto_reallocate_pool_rows(self, pool_rows: list[dict]):
        deficits = [row for row in pool_rows if Decimal(row["remaining_amount"]) < Decimal("0")]
        donors = [row for row in pool_rows if Decimal(row["remaining_amount"]) > Decimal("0")]

        for deficit in deficits:
            needed = self._round_money(-Decimal(deficit["remaining_amount"]))

            for donor in donors:
                if donor["pool_id"] == deficit["pool_id"]:
                    continue

                available = self._round_money(Decimal(donor["remaining_amount"]))
                if available <= Decimal("0"):
                    continue

                transfer = min(available, needed)
                if transfer <= Decimal("0"):
                    continue

                donor["allocated_amount"] = self._round_money(Decimal(donor["allocated_amount"]) - transfer)
                donor["remaining_amount"] = self._round_money(Decimal(donor["remaining_amount"]) - transfer)

                deficit["allocated_amount"] = self._round_money(Decimal(deficit["allocated_amount"]) + transfer)
                deficit["remaining_amount"] = self._round_money(Decimal(deficit["remaining_amount"]) + transfer)

                needed = self._round_money(needed - transfer)
                if needed <= Decimal("0"):
                    break

    def _compute_pool_status(self, pool_row: dict):
        target_amount = Decimal(pool_row["allocated_amount"])
        spent_amount = Decimal(pool_row["spent_amount"])
        threshold = Decimal(pool_row["alert_threshold"])

        utilization_percent = None
        if target_amount > 0:
            utilization_percent = float(
                ((spent_amount / target_amount) * Decimal("100")).quantize(Decimal("0.01"))
            )

        status = "on_track"
        if spent_amount > target_amount:
            status = "exceeded"
        elif utilization_percent is not None and utilization_percent >= float(threshold):
            status = "warning"

        pool_row["target_amount"] = self._round_money(target_amount)
        pool_row["utilization_percent"] = utilization_percent
        pool_row["status"] = status

    def _rebuild_goal_state_for_user(
        self,
        user_id: int,
        preferred_budget_id: int | None,
        last_recalculated_at: datetime,
    ):
        goals = self.goal_repo.list_goals_by_user(user_id, include_inactive=True)
        goal_ids = [goal.id for goal in goals]

        allocated_totals_by_goal = self.goal_repo.get_allocated_totals_by_goal_ids(goal_ids)

        from app.models import GoalState

        state_rows: list[GoalState] = []

        for goal in goals:
            current_amount = self._round_money(allocated_totals_by_goal.get(goal.id, Decimal("0.00")))
            target_amount = self._round_money(goal.target_amount or Decimal("0.00"))

            # Keep compatibility cache fields synchronized from derived computation.
            goal.current_amount = current_amount

            progress_percentage = Decimal("0.00")
            if target_amount > 0:
                progress_percentage = self._round_money(
                    min((current_amount / target_amount) * Decimal("100"), Decimal("100"))
                )

            if target_amount > 0 and current_amount >= target_amount:
                state_status = "COMPLETED"
                goal.is_active = False
            elif goal.is_active:
                state_status = "ACTIVE"
            else:
                state_status = "PAUSED"

            state_budget_id = None
            if goal.budget_pool is not None:
                state_budget_id = goal.budget_pool.budget_id
            elif preferred_budget_id is not None:
                state_budget_id = preferred_budget_id

            state_rows.append(
                GoalState(
                    goal_id=goal.id,
                    budget_id=state_budget_id,
                    current_amount=current_amount,
                    target_amount=target_amount,
                    progress_percentage=progress_percentage,
                    status=state_status,
                    last_recalculated_at=last_recalculated_at,
                )
            )

        self.goal_repo.replace_goal_states(goal_ids, state_rows)

    def _persist_derived_state(self, budget: BudgetPlan, user_id: int, computed_summary: dict, recalculated_at: datetime):
        overspend_flag = any(
            str(pool_row["status"]).lower() == "exceeded" or Decimal(pool_row["remaining_amount"]) < Decimal("0")
            for pool_row in computed_summary["pools"]
        )

        self.budget_repo.upsert_budget_period_summary(
            budget_id=budget.id,
            total_income=computed_summary["income_total"],
            total_expenses=computed_summary["spent_total"],
            total_savings=computed_summary["saved_total"],
            remaining_budget=computed_summary["saved_total"],
            overspend_flag=overspend_flag,
            last_recalculated_at=recalculated_at,
        )
        self.budget_repo.replace_budget_pool_states(
            budget_id=budget.id,
            pool_rows=computed_summary["pools"],
            last_recalculated_at=recalculated_at,
        )
        self._rebuild_goal_state_for_user(
            user_id=user_id,
            preferred_budget_id=budget.id,
            last_recalculated_at=recalculated_at,
        )

    def _build_budget_summary_from_derived(self, budget: BudgetPlan):
        period_summary = self.budget_repo.get_budget_period_summary(budget.id)
        pool_states = self.budget_repo.list_budget_pool_states(budget.id)

        if period_summary is None:
            return None

        if budget.pools and len(pool_states) != len(budget.pools):
            return None

        pool_meta_by_id = {pool.id: pool for pool in budget.pools}
        pool_rows: list[dict] = []

        for state_row in pool_states:
            pool = pool_meta_by_id.get(state_row.pool_id)
            category_name = ""
            configured_value = Decimal("0.00")
            pool_name = f"Pool #{state_row.pool_id}"
            category_id = 0
            pool_type = BudgetPoolType.FIXED_AMOUNT
            alert_threshold = Decimal("80.00")

            if pool is not None:
                pool_name = pool.name
                category_id = pool.category_id
                category_name = pool.category.name if pool.category else ""
                configured_value = self._round_money(pool.target_value)
                pool_type = pool.pool_type
                alert_threshold = self._round_money(pool.alert_threshold)

            utilization_percent = None
            if state_row.usage_percentage is not None:
                utilization_percent = float(self._round_money(state_row.usage_percentage))

            pool_rows.append(
                {
                    "pool_id": state_row.pool_id,
                    "pool_name": pool_name,
                    "category_id": category_id,
                    "category_name": category_name,
                    "pool_type": pool_type,
                    "configured_value": configured_value,
                    "allocated_amount": self._round_money(state_row.allocated_amount),
                    "target_amount": self._round_money(state_row.allocated_amount),
                    "spent_amount": self._round_money(state_row.spent_amount),
                    "remaining_amount": self._round_money(state_row.remaining_amount),
                    "utilization_percent": utilization_percent,
                    "alert_threshold": alert_threshold,
                    "status": str(state_row.status).lower(),
                }
            )

        income_total = self._round_money(period_summary.total_income)
        spent_total = self._round_money(period_summary.total_expenses)
        saved_total = self._round_money(period_summary.total_savings)

        savings_rate = None
        if income_total > 0:
            savings_rate = float(((saved_total / income_total) * Decimal("100")).quantize(Decimal("0.01")))

        return {
            "budget_id": budget.id,
            "period_start": budget.period_start,
            "period_end": budget.period_end,
            "currency": budget.currency,
            "income_total": income_total,
            "spent_total": spent_total,
            "saved_total": saved_total,
            "savings_rate": savings_rate,
            "overspending_strategy": self.settings.BUDGET_OVERSPENDING_STRATEGY,
            "pools": pool_rows,
        }

    def _compute_budget_state(self, budget: BudgetPlan, user_id: int):
        period_start_dt, period_end_dt = self._to_datetime_range(budget.period_start, budget.period_end)

        income_total = Decimal(
            self.income_repo.get_total_amount(
                user_id=user_id,
                date_from=period_start_dt,
                date_to=period_end_dt,
                currency=budget.currency,
            )
        )

        spent_total = Decimal(
            self.budget_repo.get_personal_spent_total(
                user_id=user_id,
                date_from=period_start_dt,
                date_to=period_end_dt,
                currency=budget.currency,
            )
        )

        spent_by_category_rows = self.budget_repo.get_personal_spent_by_category(
            user_id=user_id,
            date_from=period_start_dt,
            date_to=period_end_dt,
            currency=budget.currency,
        )
        spent_by_category = {
            int(row.category_id): Decimal(str(row.spent_amount or 0))
            for row in spent_by_category_rows
        }

        goal_allocated_rows = self.budget_repo.get_goal_allocated_by_pool(budget.id)
        goal_allocated_by_pool = {
            int(row.pool_id): Decimal(str(row.allocated_amount or 0))
            for row in goal_allocated_rows
        }
        goal_allocated_total = self._round_money(sum(goal_allocated_by_pool.values(), Decimal("0.00")))

        effective_spent_total = self._round_money(spent_total + goal_allocated_total)
        saved_total = self._round_money(income_total - effective_spent_total)
        savings_rate = None
        if income_total > 0:
            savings_rate = float(((saved_total / income_total) * Decimal("100")).quantize(Decimal("0.01")))

        allocation_map = self._build_pool_allocation_map(budget, income_total)

        pool_rows: list[dict] = []
        for pool in budget.pools:
            allocated_amount = self._round_money(
                Decimal(allocation_map.get(pool.id, Decimal("0"))) + Decimal(pool.rollover_amount or 0)
            )
            expense_spent_amount = self._round_money(spent_by_category.get(pool.category_id, Decimal("0")))
            goal_spent_amount = self._round_money(goal_allocated_by_pool.get(pool.id, Decimal("0")))
            spent_amount = self._round_money(expense_spent_amount + goal_spent_amount)
            remaining_amount = self._round_money(allocated_amount - spent_amount)

            pool_rows.append(
                {
                    "pool_id": pool.id,
                    "pool_name": pool.name,
                    "category_id": pool.category_id,
                    "category_name": pool.category.name if pool.category else "",
                    "pool_type": pool.pool_type,
                    "configured_value": self._round_money(Decimal(pool.target_value)),
                    "allocated_amount": allocated_amount,
                    "spent_amount": spent_amount,
                    "remaining_amount": remaining_amount,
                    "alert_threshold": Decimal(pool.alert_threshold),
                }
            )

        if self.settings.BUDGET_OVERSPENDING_STRATEGY == OverspendingStrategy.AUTO_REALLOCATE:
            self._auto_reallocate_pool_rows(pool_rows)

        pool_by_id = {pool.id: pool for pool in budget.pools}
        now_utc = datetime.now(timezone.utc)

        for pool_row in pool_rows:
            self._compute_pool_status(pool_row)

            pool = pool_by_id[pool_row["pool_id"]]
            pool.allocated_amount = pool_row["allocated_amount"]
            pool.spent_amount = pool_row["spent_amount"]
            pool.remaining_amount = pool_row["remaining_amount"]
            pool.last_recalculated_at = now_utc

        computed_summary = {
            "budget_id": budget.id,
            "period_start": budget.period_start,
            "period_end": budget.period_end,
            "currency": budget.currency,
            "income_total": self._round_money(income_total),
            "spent_total": effective_spent_total,
            "saved_total": saved_total,
            "savings_rate": savings_rate,
            "overspending_strategy": self.settings.BUDGET_OVERSPENDING_STRATEGY,
            "pools": pool_rows,
        }

        self._persist_derived_state(
            budget=budget,
            user_id=user_id,
            computed_summary=computed_summary,
            recalculated_at=now_utc,
        )

        return computed_summary

    def _enforce_overspending_policy(self, pool_rows: list[dict]):
        strategy = self.settings.BUDGET_OVERSPENDING_STRATEGY
        if strategy != OverspendingStrategy.BLOCK:
            return

        exceeded_pool = next((row for row in pool_rows if Decimal(row["remaining_amount"]) < Decimal("0")), None)
        if exceeded_pool is None:
            return

        raise HTTPException(
            status_code=400,
            detail=f"Budget limit exceeded for pool '{exceeded_pool['pool_name']}'",
        )

    def _build_template_pools(self, user_id: int) -> list[BudgetPoolCreate]:
        categories = self.category_service.get_default_and_personal_categories(user_id)

        by_section: dict[str, int] = {}
        fallback_category_id: int | None = None

        for category in categories:
            if fallback_category_id is None:
                fallback_category_id = category.id

            section_key = str(category.section.value)
            by_section.setdefault(section_key, category.id)

        if fallback_category_id is None:
            raise HTTPException(status_code=400, detail="No available personal categories for budget template")

        needs_category_id = by_section.get(CategorySection.BILLS.value, fallback_category_id)
        wants_category_id = by_section.get(CategorySection.LIFESTYLE.value, fallback_category_id)
        savings_category_id = by_section.get(CategorySection.FINANCE.value, fallback_category_id)

        return [
            BudgetPoolCreate(
                name="Needs",
                category_id=needs_category_id,
                pool_type=BudgetPoolType.PERCENT_INCOME,
                target_value=Decimal("50"),
                alert_threshold=Decimal("80"),
            ),
            BudgetPoolCreate(
                name="Wants",
                category_id=wants_category_id,
                pool_type=BudgetPoolType.PERCENT_INCOME,
                target_value=Decimal("30"),
                alert_threshold=Decimal("80"),
            ),
            BudgetPoolCreate(
                name="Savings",
                category_id=savings_category_id,
                pool_type=BudgetPoolType.PERCENT_INCOME,
                target_value=Decimal("20"),
                alert_threshold=Decimal("80"),
            ),
        ]

    def _assert_budget_access(self, budget_id: int, user_id: int) -> BudgetPlan:
        budget = self.budget_repo.get_plan_by_id_for_user(budget_id, user_id)
        if not budget:
            raise HTTPException(status_code=404, detail="Budget not found")
        return budget

    def _assert_pool_access(self, pool_id: int, budget_id: int, user_id: int) -> BudgetPool:
        pool = self.budget_repo.get_pool_by_id(pool_id)
        if not pool or pool.budget_id != budget_id:
            raise HTTPException(status_code=404, detail="Budget pool not found")

        budget = self._assert_budget_access(budget_id, user_id)
        if budget.id != pool.budget_id:
            raise HTTPException(status_code=404, detail="Budget pool not found")

        return pool

    def create_budget_plan(self, budget_in: BudgetPlanCreate, user_id: int) -> BudgetPlan:
        if budget_in.income_target is not None and budget_in.income_target <= 0:
            raise HTTPException(status_code=400, detail="income_target must be greater than 0")

        self._validate_budget_period(budget_in.period_type, budget_in.period_start, budget_in.period_end)

        overlapping = self.budget_repo.find_overlapping_active_plan(
            user_id=user_id,
            period_start=budget_in.period_start,
            period_end=budget_in.period_end,
        )
        if overlapping:
            raise HTTPException(status_code=400, detail="Budget period overlaps with existing active budget")

        pools = list(budget_in.pools)
        template_key = None

        if budget_in.use_template_50_30_20 and not pools:
            pools = self._build_template_pools(user_id)
            template_key = "50_30_20"

        if not pools:
            raise HTTPException(status_code=400, detail="Budget requires at least one pool")

        for pool in pools:
            self._validate_pool_payload(pool, user_id)
        self._validate_pool_mix(pools, budget_in.income_target)

        try:
            budget = BudgetPlan(
                user_id=user_id,
                name=budget_in.name,
                currency=budget_in.currency,
                period_type=budget_in.period_type,
                allocation_strategy=budget_in.allocation_strategy,
                period_start=budget_in.period_start,
                period_end=budget_in.period_end,
                income_target=budget_in.income_target,
                status=BudgetStatus.ACTIVE,
                template_key=template_key,
            )
            budget = self.budget_repo.create_plan(budget)

            for pool_in in pools:
                self.budget_repo.create_pool(
                    BudgetPool(
                        budget_id=budget.id,
                        name=pool_in.name,
                        category_id=pool_in.category_id,
                        pool_type=pool_in.pool_type,
                        target_value=self._round_money(pool_in.target_value),
                        alert_threshold=Decimal(pool_in.alert_threshold),
                        rollover_enabled=pool_in.rollover_enabled,
                        rollover_negative_enabled=pool_in.rollover_negative_enabled,
                    )
                )

            self.budget_repo.save_all()
        except Exception:
            self.budget_repo.db.rollback()
            raise

        created = self.budget_repo.get_plan_by_id_for_user(budget.id, user_id)
        if not created:
            raise HTTPException(status_code=500, detail="Could not load created budget")

        self._compute_budget_state(created, user_id)
        self.budget_repo.save_all()

        return created

    def list_budget_plans(self, user_id: int, status: BudgetStatus | None = None) -> list[BudgetPlan]:
        return self.budget_repo.list_plans_by_user(user_id, status)

    def get_budget_plan(self, budget_id: int, user_id: int) -> BudgetPlan:
        return self._assert_budget_access(budget_id, user_id)

    def update_budget_plan(self, budget_id: int, budget_in: BudgetPlanUpdate, user_id: int) -> BudgetPlan:
        budget = self._assert_budget_access(budget_id, user_id)
        update_data = budget_in.model_dump(exclude_unset=True)

        if "income_target" in update_data and update_data["income_target"] is not None and update_data["income_target"] <= 0:
            raise HTTPException(status_code=400, detail="income_target must be greater than 0")

        try:
            for field, value in update_data.items():
                setattr(budget, field, value)

            self._compute_budget_state(budget, user_id)
            self.budget_repo.save_all()
            return self._assert_budget_access(budget_id, user_id)
        except Exception:
            self.budget_repo.db.rollback()
            raise

    def delete_budget_plan(self, budget_id: int, user_id: int):
        budget = self._assert_budget_access(budget_id, user_id)
        self.budget_repo.delete_plan(budget)
        self.budget_repo.save_all()

    def add_budget_pool(self, budget_id: int, pool_in: BudgetPoolCreate, user_id: int) -> BudgetPool:
        budget = self._assert_budget_access(budget_id, user_id)
        self._validate_pool_payload(pool_in, user_id)

        try:
            pool = self.budget_repo.create_pool(
                BudgetPool(
                    budget_id=budget.id,
                    name=pool_in.name,
                    category_id=pool_in.category_id,
                    pool_type=pool_in.pool_type,
                    target_value=self._round_money(pool_in.target_value),
                    alert_threshold=Decimal(pool_in.alert_threshold),
                    rollover_enabled=pool_in.rollover_enabled,
                    rollover_negative_enabled=pool_in.rollover_negative_enabled,
                )
            )

            budget = self._assert_budget_access(budget_id, user_id)
            self._compute_budget_state(budget, user_id)
            self.budget_repo.save_all()
            return pool
        except Exception:
            self.budget_repo.db.rollback()
            raise

    def update_budget_pool(self, budget_id: int, pool_id: int, pool_in: BudgetPoolUpdate, user_id: int) -> BudgetPool:
        pool = self._assert_pool_access(pool_id, budget_id, user_id)
        update_data = pool_in.model_dump(exclude_unset=True)

        if "category_id" in update_data and update_data["category_id"] is not None:
            self.category_service.validate_available_for_personal_expense(update_data["category_id"], user_id)

        if "target_value" in update_data and update_data["target_value"] is not None and update_data["target_value"] <= 0:
            raise HTTPException(status_code=400, detail="Pool target value must be greater than 0")

        if "alert_threshold" in update_data and update_data["alert_threshold"] is not None:
            threshold = Decimal(update_data["alert_threshold"])
            if threshold <= 0 or threshold > 100:
                raise HTTPException(status_code=400, detail="Pool alert threshold must be in range (0, 100]")

        if "pool_type" in update_data and update_data["pool_type"] == BudgetPoolType.PERCENT_INCOME:
            candidate_target = Decimal(update_data.get("target_value", pool.target_value))
            if candidate_target > 100:
                raise HTTPException(status_code=400, detail="Percent pool target cannot be greater than 100")

        try:
            for field, value in update_data.items():
                if field == "target_value" and value is not None:
                    setattr(pool, field, self._round_money(value))
                else:
                    setattr(pool, field, value)

            budget = self._assert_budget_access(budget_id, user_id)
            self._compute_budget_state(budget, user_id)
            self.budget_repo.save_all()
            updated = self.budget_repo.get_pool_by_id(pool.id)
            if not updated:
                raise HTTPException(status_code=404, detail="Budget pool not found")
            return updated
        except Exception:
            self.budget_repo.db.rollback()
            raise

    def delete_budget_pool(self, budget_id: int, pool_id: int, user_id: int):
        pool = self._assert_pool_access(pool_id, budget_id, user_id)
        self.budget_repo.delete_pool(pool)
        budget = self._assert_budget_access(budget_id, user_id)
        self._compute_budget_state(budget, user_id)
        self.budget_repo.save_all()

    def _close_budget_with_rollover(self, budget: BudgetPlan, closed_at: date):
        if budget.status != BudgetStatus.ACTIVE:
            raise HTTPException(status_code=400, detail="Budget is not active")

        if closed_at < budget.period_end:
            raise HTTPException(status_code=400, detail="Budget period has not ended yet")

        if self.budget_repo.has_rollover_for_budget(budget.id):
            raise HTTPException(status_code=409, detail="Budget rollover already executed")

        self._compute_budget_state(budget, budget.user_id)

        next_period_start, next_period_end = self._next_period_bounds(budget.period_type, budget.period_end)

        overlapping = self.budget_repo.find_overlapping_active_plan(
            user_id=budget.user_id,
            period_start=next_period_start,
            period_end=next_period_end,
            exclude_budget_id=budget.id,
        )
        if overlapping is not None:
            raise HTTPException(status_code=400, detail="Next budget period overlaps with existing active budget")

        next_budget = self.budget_repo.create_plan(
            BudgetPlan(
                user_id=budget.user_id,
                name=budget.name,
                currency=budget.currency,
                period_type=budget.period_type,
                allocation_strategy=budget.allocation_strategy,
                period_start=next_period_start,
                period_end=next_period_end,
                income_target=budget.income_target,
                status=BudgetStatus.ACTIVE,
                template_key=budget.template_key,
            )
        )

        rolled_pools_count = 0
        total_rollover_amount = Decimal("0.00")

        for current_pool in budget.pools:
            rollover_amount = self._compute_pool_rollover_amount(current_pool)

            new_pool = self.budget_repo.create_pool(
                BudgetPool(
                    budget_id=next_budget.id,
                    name=current_pool.name,
                    category_id=current_pool.category_id,
                    pool_type=current_pool.pool_type,
                    target_value=self._round_money(current_pool.target_value),
                    alert_threshold=self._round_money(current_pool.alert_threshold),
                    rollover_enabled=current_pool.rollover_enabled,
                    rollover_negative_enabled=current_pool.rollover_negative_enabled,
                    rollover_amount=rollover_amount,
                )
            )

            self.budget_repo.create_rollover(
                BudgetRollover(
                    from_budget_id=budget.id,
                    to_budget_id=next_budget.id,
                    from_pool_id=current_pool.id,
                    to_pool_id=new_pool.id,
                    rollover_amount=rollover_amount,
                    is_negative=rollover_amount < 0,
                )
            )

            if rollover_amount != 0:
                rolled_pools_count += 1
                total_rollover_amount = self._round_money(total_rollover_amount + rollover_amount)

        budget.status = BudgetStatus.ARCHIVED

        created_next_budget = self.budget_repo.get_plan_by_id_for_user(next_budget.id, budget.user_id)
        if not created_next_budget:
            raise HTTPException(status_code=500, detail="Could not load rolled-over budget")

        self._compute_budget_state(created_next_budget, budget.user_id)

        # Apply optional per-period goal auto-allocation after next budget is created.
        from .goal_service import GoalService

        goal_service = GoalService(self.budget_repo.db)
        goal_service.auto_allocate_for_budget(created_next_budget.id, budget.user_id, commit=False)

        self._compute_budget_state(created_next_budget, budget.user_id)
        self.budget_repo.save_all()

        return {
            "from_budget_id": budget.id,
            "to_budget_id": created_next_budget.id,
            "rolled_pools_count": rolled_pools_count,
            "total_rollover_amount": self._round_money(total_rollover_amount),
            "closed_at": closed_at,
        }

    def close_budget_period(self, budget_id: int, user_id: int, closed_at: date | None = None):
        budget = self._assert_budget_access(budget_id, user_id)
        close_date = closed_at or date.today()
        return self._close_budget_with_rollover(budget, close_date)

    def run_due_rollovers(self, as_of_date: date | None = None):
        check_date = as_of_date or date.today()
        due_budgets = self.budget_repo.list_due_active_plans(check_date)

        created_budgets_count = 0
        for due_budget in due_budgets:
            try:
                self._close_budget_with_rollover(due_budget, check_date)
                created_budgets_count += 1
            except Exception:
                self.budget_repo.db.rollback()
                logger.exception("Failed to roll over budget_id=%s", due_budget.id)

        return {
            "processed_budgets_count": len(due_budgets),
            "created_budgets_count": created_budgets_count,
        }

    def sync_budget_state_for_date(
        self,
        user_id: int,
        currency: CurrencyEnum,
        check_date: date,
        enforce_overspending: bool = True,
    ):
        budget = self.budget_repo.get_active_plan_for_date(
            user_id=user_id,
            check_date=check_date,
            currency=currency,
        )
        if not budget:
            return None

        summary = self._compute_budget_state(budget, user_id)
        if enforce_overspending:
            self._enforce_overspending_policy(summary["pools"])

        return summary

    def refresh_goal_state_for_user(self, user_id: int, preferred_budget_id: int | None = None, commit: bool = True):
        self._rebuild_goal_state_for_user(
            user_id=user_id,
            preferred_budget_id=preferred_budget_id,
            last_recalculated_at=datetime.now(timezone.utc),
        )

        if commit:
            self.budget_repo.save_all()

    def recalculate_budget_state(self, budget_id: int, user_id: int):
        budget = self._assert_budget_access(budget_id, user_id)
        self._compute_budget_state(budget, user_id)
        self.budget_repo.save_all()

        derived_summary = self._build_budget_summary_from_derived(budget)
        if derived_summary is None:
            raise HTTPException(status_code=500, detail="Could not load derived budget summary")

        return derived_summary

    def get_budget_summary(self, budget_id: int, user_id: int):
        budget = self._assert_budget_access(budget_id, user_id)
        derived_summary = self._build_budget_summary_from_derived(budget)

        if derived_summary is not None:
            return derived_summary

        return self.recalculate_budget_state(budget_id, user_id)
