from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.enums import BudgetStatus, CurrencyEnum
from app.models import BudgetPlan, BudgetPool, BudgetRollover, Expense, SavingsGoalAllocation


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

    def save_all(self):
        self.db.commit()
