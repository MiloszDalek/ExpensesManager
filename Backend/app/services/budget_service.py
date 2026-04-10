from calendar import monthrange
from datetime import date, datetime, time
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.enums import BudgetPeriodType, BudgetPoolType, BudgetStatus, CategorySection
from app.models import BudgetPlan, BudgetPool
from app.repositories import BudgetRepository, IncomeRepository
from app.schemas import BudgetPlanCreate, BudgetPlanUpdate, BudgetPoolCreate, BudgetPoolUpdate

from .category_service import CategoryService


class BudgetService:
    def __init__(self, db: Session):
        self.budget_repo = BudgetRepository(db)
        self.income_repo = IncomeRepository(db)
        self.category_service = CategoryService(db)

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
                    )
                )

            self.budget_repo.save_all()
        except Exception:
            self.budget_repo.db.rollback()
            raise

        created = self.budget_repo.get_plan_by_id_for_user(budget.id, user_id)
        if not created:
            raise HTTPException(status_code=500, detail="Could not load created budget")
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
                )
            )
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
        self.budget_repo.save_all()

    def get_budget_summary(self, budget_id: int, user_id: int):
        budget = self._assert_budget_access(budget_id, user_id)
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

        saved_total = income_total - spent_total
        savings_rate = None
        if income_total > 0:
            savings_rate = float(((saved_total / income_total) * Decimal("100")).quantize(Decimal("0.01")))

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

        pool_summaries = []
        for pool in budget.pools:
            if pool.pool_type == BudgetPoolType.PERCENT_INCOME:
                target_amount = self._round_money((income_total * Decimal(pool.target_value)) / Decimal("100"))
            else:
                target_amount = self._round_money(Decimal(pool.target_value))

            spent_amount = self._round_money(spent_by_category.get(pool.category_id, Decimal("0")))
            remaining_amount = self._round_money(target_amount - spent_amount)

            utilization_percent = None
            if target_amount > 0:
                utilization_percent = float(
                    ((spent_amount / target_amount) * Decimal("100")).quantize(Decimal("0.01"))
                )

            status = "on_track"
            if spent_amount > target_amount:
                status = "exceeded"
            elif utilization_percent is not None and utilization_percent >= float(pool.alert_threshold):
                status = "warning"

            pool_summaries.append(
                {
                    "pool_id": pool.id,
                    "pool_name": pool.name,
                    "category_id": pool.category_id,
                    "category_name": pool.category.name if pool.category else "",
                    "pool_type": pool.pool_type,
                    "configured_value": self._round_money(Decimal(pool.target_value)),
                    "target_amount": target_amount,
                    "spent_amount": spent_amount,
                    "remaining_amount": remaining_amount,
                    "utilization_percent": utilization_percent,
                    "alert_threshold": Decimal(pool.alert_threshold),
                    "status": status,
                }
            )

        return {
            "budget_id": budget.id,
            "period_start": budget.period_start,
            "period_end": budget.period_end,
            "currency": budget.currency,
            "income_total": self._round_money(income_total),
            "spent_total": self._round_money(spent_total),
            "saved_total": self._round_money(saved_total),
            "savings_rate": savings_rate,
            "pools": pool_summaries,
        }
