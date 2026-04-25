from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.enums import BudgetStatus, CurrencyEnum
from app.models import (
    BudgetPeriodSummary,
    BudgetPlan,
    BudgetPool,
    BudgetPoolState,
    BudgetRollover,
    Expense,
    ExpenseShare,
    SavingsGoalAllocation,
)


class BudgetRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_plan(self, budget_plan: BudgetPlan) -> BudgetPlan:
        self.db.add(budget_plan)
        self.db.flush()
        return budget_plan

    def create_pool(self, budget_pool: BudgetPool) -> BudgetPool:
        self.db.add(budget_pool)
        self.db.flush()
        return budget_pool

    def list_plans_by_user(self, user_id: int, status: BudgetStatus | None = None) -> list[BudgetPlan]:
        query = (
            self.db.query(BudgetPlan)
            .options(selectinload(BudgetPlan.pools).selectinload(BudgetPool.category))
            .filter(BudgetPlan.user_id == user_id)
        )

        if status is not None:
            query = query.filter(BudgetPlan.status == status)

        return query.order_by(BudgetPlan.period_start.desc(), BudgetPlan.id.desc()).all()

    def get_plan_by_id(self, budget_id: int) -> BudgetPlan | None:
        return (
            self.db.query(BudgetPlan)
            .options(selectinload(BudgetPlan.pools).selectinload(BudgetPool.category))
            .filter(BudgetPlan.id == budget_id)
            .first()
        )

    def get_plan_by_id_for_user(self, budget_id: int, user_id: int) -> BudgetPlan | None:
        return (
            self.db.query(BudgetPlan)
            .options(selectinload(BudgetPlan.pools).selectinload(BudgetPool.category))
            .filter(BudgetPlan.id == budget_id, BudgetPlan.user_id == user_id)
            .first()
        )

    def get_pool_by_id(self, pool_id: int) -> BudgetPool | None:
        return self.db.query(BudgetPool).options(selectinload(BudgetPool.category)).filter(BudgetPool.id == pool_id).first()

    def get_active_plan_for_date(
        self,
        user_id: int,
        check_date: date,
        currency: CurrencyEnum,
    ) -> BudgetPlan | None:
        return (
            self.db.query(BudgetPlan)
            .options(selectinload(BudgetPlan.pools).selectinload(BudgetPool.category))
            .filter(
                BudgetPlan.user_id == user_id,
                BudgetPlan.status == BudgetStatus.ACTIVE,
                BudgetPlan.currency == currency,
                BudgetPlan.period_start <= check_date,
                BudgetPlan.period_end >= check_date,
            )
            .order_by(BudgetPlan.period_start.desc(), BudgetPlan.id.desc())
            .first()
        )

    def find_overlapping_active_plan(
        self,
        user_id: int,
        period_start,
        period_end,
        exclude_budget_id: int | None = None,
    ) -> BudgetPlan | None:
        query = self.db.query(BudgetPlan).filter(
            BudgetPlan.user_id == user_id,
            BudgetPlan.status == BudgetStatus.ACTIVE,
            BudgetPlan.period_start <= period_end,
            BudgetPlan.period_end >= period_start,
        )

        if exclude_budget_id is not None:
            query = query.filter(BudgetPlan.id != exclude_budget_id)

        return query.first()

    def list_due_active_plans(self, as_of_date: date) -> list[BudgetPlan]:
        return (
            self.db.query(BudgetPlan)
            .options(selectinload(BudgetPlan.pools).selectinload(BudgetPool.category))
            .filter(
                BudgetPlan.status == BudgetStatus.ACTIVE,
                BudgetPlan.period_end <= as_of_date,
            )
            .order_by(BudgetPlan.period_end.asc(), BudgetPlan.id.asc())
            .all()
        )

    def has_rollover_for_budget(self, from_budget_id: int) -> bool:
        return (
            self.db.query(BudgetRollover)
            .filter(BudgetRollover.from_budget_id == from_budget_id)
            .first()
            is not None
        )

    def create_rollover(self, rollover: BudgetRollover) -> BudgetRollover:
        self.db.add(rollover)
        self.db.flush()
        return rollover

    def delete_plan(self, budget_plan: BudgetPlan):
        self.db.delete(budget_plan)
        self.db.flush()

    def delete_pool(self, budget_pool: BudgetPool):
        self.db.delete(budget_pool)
        self.db.flush()

    def get_personal_spent_total(
        self,
        user_id: int,
        date_from: datetime,
        date_to: datetime,
        currency: CurrencyEnum,
    ):
        return (
            self.db.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                Expense.user_id == user_id,
                Expense.group_id.is_(None),
                Expense.currency == currency,
                Expense.expense_date >= date_from,
                Expense.expense_date <= date_to,
            )
            .scalar()
            or 0
        )

    def get_personal_spent_by_category(
        self,
        user_id: int,
        date_from: datetime,
        date_to: datetime,
        currency: CurrencyEnum,
    ):
        return (
            self.db.query(
                Expense.category_id.label("category_id"),
                func.coalesce(func.sum(Expense.amount), 0).label("spent_amount"),
            )
            .filter(
                Expense.user_id == user_id,
                Expense.group_id.is_(None),
                Expense.currency == currency,
                Expense.expense_date >= date_from,
                Expense.expense_date <= date_to,
            )
            .group_by(Expense.category_id)
            .all()
        )

    def get_group_share_spent_total(
        self,
        user_id: int,
        date_from: datetime,
        date_to: datetime,
        currency: CurrencyEnum,
    ):
        return (
            self.db.query(func.coalesce(func.sum(ExpenseShare.share_amount), 0))
            .join(Expense, Expense.id == ExpenseShare.expense_id)
            .filter(
                ExpenseShare.user_id == user_id,
                Expense.group_id.isnot(None),
                Expense.currency == currency,
                Expense.expense_date >= date_from,
                Expense.expense_date <= date_to,
            )
            .scalar()
            or 0
        )

    def get_group_share_spent_by_category(
        self,
        user_id: int,
        date_from: datetime,
        date_to: datetime,
        currency: CurrencyEnum,
    ):
        return (
            self.db.query(
                Expense.category_id.label("category_id"),
                func.coalesce(func.sum(ExpenseShare.share_amount), 0).label("spent_amount"),
            )
            .join(Expense, Expense.id == ExpenseShare.expense_id)
            .filter(
                ExpenseShare.user_id == user_id,
                Expense.group_id.isnot(None),
                Expense.currency == currency,
                Expense.expense_date >= date_from,
                Expense.expense_date <= date_to,
            )
            .group_by(Expense.category_id)
            .all()
        )

    def get_goal_allocated_by_pool(self, budget_id: int):
        return (
            self.db.query(
                SavingsGoalAllocation.budget_pool_id.label("pool_id"),
                func.coalesce(func.sum(SavingsGoalAllocation.amount), 0).label("allocated_amount"),
            )
            .filter(
                SavingsGoalAllocation.budget_id == budget_id,
                SavingsGoalAllocation.budget_pool_id.isnot(None),
            )
            .group_by(SavingsGoalAllocation.budget_pool_id)
            .all()
        )

    def upsert_budget_period_summary(
        self,
        budget_id: int,
        total_income,
        total_expenses,
        total_savings,
        remaining_budget,
        overspend_flag: bool,
        last_recalculated_at: datetime,
    ) -> BudgetPeriodSummary:
        summary = self.get_budget_period_summary(budget_id)
        if summary is None:
            summary = BudgetPeriodSummary(
                budget_id=budget_id,
                total_income=total_income,
                total_expenses=total_expenses,
                total_savings=total_savings,
                remaining_budget=remaining_budget,
                overspend_flag=overspend_flag,
                last_recalculated_at=last_recalculated_at,
            )
            self.db.add(summary)
            self.db.flush()
            return summary

        summary.total_income = total_income
        summary.total_expenses = total_expenses
        summary.total_savings = total_savings
        summary.remaining_budget = remaining_budget
        summary.overspend_flag = overspend_flag
        summary.last_recalculated_at = last_recalculated_at
        self.db.flush()
        return summary

    def replace_budget_pool_states(
        self,
        budget_id: int,
        pool_rows: list[dict],
        last_recalculated_at: datetime,
    ):
        self.db.query(BudgetPoolState).filter(BudgetPoolState.budget_id == budget_id).delete(synchronize_session=False)

        for row in pool_rows:
            usage_percentage = row.get("utilization_percent")
            usage_decimal = None if usage_percentage is None else row.get("utilization_percent")

            self.db.add(
                BudgetPoolState(
                    budget_id=budget_id,
                    pool_id=row["pool_id"],
                    allocated_amount=row["allocated_amount"],
                    spent_amount=row["spent_amount"],
                    remaining_amount=row["remaining_amount"],
                    usage_percentage=usage_decimal,
                    status=str(row["status"]).upper(),
                    last_recalculated_at=last_recalculated_at,
                )
            )

        self.db.flush()

    def get_budget_period_summary(self, budget_id: int) -> BudgetPeriodSummary | None:
        return (
            self.db.query(BudgetPeriodSummary)
            .filter(BudgetPeriodSummary.budget_id == budget_id)
            .first()
        )

    def list_budget_pool_states(self, budget_id: int) -> list[BudgetPoolState]:
        return (
            self.db.query(BudgetPoolState)
            .filter(BudgetPoolState.budget_id == budget_id)
            .order_by(BudgetPoolState.id.asc())
            .all()
        )

    def list_all_active_plans(self) -> list[BudgetPlan]:
        """Get all active budget plans across all users."""
        return (
            self.db.query(BudgetPlan)
            .options(selectinload(BudgetPlan.pools).selectinload(BudgetPool.category))
            .filter(BudgetPlan.status == BudgetStatus.ACTIVE)
            .order_by(BudgetPlan.period_start.desc(), BudgetPlan.id.desc())
            .all()
        )

    def save_all(self):
        self.db.commit()
