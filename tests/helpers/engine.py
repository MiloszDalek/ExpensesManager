from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import SavingsGoal
from app.repositories import BudgetRepository
from app.services import BudgetService


@dataclass
class EngineResult:
    summary: dict
    pool_states: list[dict]
    goal_states: list[dict]


class BudgetEngine:
    """Thin testing facade around `BudgetService.recalculate_budget_state`.

    Historically this helper read snapshot rows from `budget_pool_states` and
    `goal_states` tables. After the refactor those caches were removed: all
    derived values are now produced live by `BudgetService` and persisted on
    `budget_pools` / `savings_goals`. This helper rebuilds the legacy
    `EngineResult` shape from those live sources so existing tests keep
    working without behavioral changes.
    """

    def __init__(self, db: Session):
        self.db = db
        self.budget_repo = BudgetRepository(db)
        self.budget_service = BudgetService(db)

    @staticmethod
    def _normalize_summary(raw_summary: dict, pool_states: list[dict]) -> dict:
        overspend_flag = any(str(state["status"]).upper() == "EXCEEDED" for state in pool_states)

        return {
            "budget_id": raw_summary["budget_id"],
            "total_income": Decimal(raw_summary["income_total"]),
            "total_expenses": Decimal(raw_summary["spent_total"]),
            "total_savings": Decimal(raw_summary["saved_total"]),
            "remaining_budget": Decimal(raw_summary["saved_total"]),
            "overspend_flag": overspend_flag,
        }

    @staticmethod
    def _pool_states_from_summary(raw_summary: dict) -> list[dict]:
        rows: list[dict] = []
        for pool_row in raw_summary["pools"]:
            usage = pool_row.get("utilization_percent")
            rows.append(
                {
                    "pool_id": pool_row["pool_id"],
                    "allocated_amount": Decimal(pool_row["allocated_amount"]),
                    "spent_amount": Decimal(pool_row["spent_amount"]),
                    "remaining_amount": Decimal(pool_row["remaining_amount"]),
                    "usage_percentage": None if usage is None else Decimal(str(usage)),
                    "status": str(pool_row["status"]).upper(),
                }
            )
        rows.sort(key=lambda item: item["pool_id"])
        return rows

    def _goal_states_for_budget(self, budget_id: int, user_id: int) -> list[dict]:
        goals = (
            self.db.query(SavingsGoal)
            .filter(SavingsGoal.user_id == user_id)
            .order_by(SavingsGoal.id.asc())
            .all()
        )

        result: list[dict] = []
        for goal in goals:
            current_amount = Decimal(goal.current_amount or 0)
            target_amount = Decimal(goal.target_amount or 0)

            if target_amount > 0 and current_amount >= target_amount:
                status = "COMPLETED"
            elif goal.is_active:
                status = "ACTIVE"
            else:
                status = "PAUSED"

            if target_amount > 0:
                progress = (current_amount / target_amount) * Decimal("100")
                progress = min(progress, Decimal("100"))
            else:
                progress = Decimal("0")

            linked_budget_id = goal.budget_pool.budget_id if goal.budget_pool is not None else None

            result.append(
                {
                    "goal_id": goal.id,
                    "budget_id": linked_budget_id if linked_budget_id is not None else budget_id,
                    "current_amount": current_amount,
                    "target_amount": target_amount,
                    "progress_percentage": progress,
                    "status": status,
                }
            )

        return result

    def recalculate(self, budget_id: int) -> EngineResult:
        budget = self.budget_repo.get_plan_by_id(budget_id)
        if budget is None:
            raise ValueError(f"Budget with id={budget_id} was not found")

        raw_summary = self.budget_service.recalculate_budget_state(budget_id, budget.user_id)

        pool_states = self._pool_states_from_summary(raw_summary)
        goal_states = self._goal_states_for_budget(budget_id, budget.user_id)
        summary = self._normalize_summary(raw_summary, pool_states)

        return EngineResult(summary=summary, pool_states=pool_states, goal_states=goal_states)


def run(engine: BudgetEngine, budget_id: int) -> EngineResult:
    return engine.recalculate(budget_id)
