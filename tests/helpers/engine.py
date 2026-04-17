from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import GoalState
from app.repositories import BudgetRepository
from app.services import BudgetService


@dataclass
class EngineResult:
    summary: dict
    pool_states: list[dict]
    goal_states: list[dict]


class BudgetEngine:
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

    def recalculate(self, budget_id: int) -> EngineResult:
        budget = self.budget_repo.get_plan_by_id(budget_id)
        if budget is None:
            raise ValueError(f"Budget with id={budget_id} was not found")

        raw_summary = self.budget_service.recalculate_budget_state(budget_id, budget.user_id)

        pool_state_rows = self.budget_repo.list_budget_pool_states(budget_id)
        pool_states = sorted(
            [
                {
                    "pool_id": row.pool_id,
                    "allocated_amount": Decimal(row.allocated_amount),
                    "spent_amount": Decimal(row.spent_amount),
                    "remaining_amount": Decimal(row.remaining_amount),
                    "usage_percentage": None if row.usage_percentage is None else Decimal(row.usage_percentage),
                    "status": str(row.status).upper(),
                }
                for row in pool_state_rows
            ],
            key=lambda item: item["pool_id"],
        )

        goal_state_rows = (
            self.db.query(GoalState)
            .filter(GoalState.budget_id == budget_id)
            .order_by(GoalState.goal_id.asc())
            .all()
        )
        goal_states = [
            {
                "goal_id": row.goal_id,
                "budget_id": row.budget_id,
                "current_amount": Decimal(row.current_amount),
                "target_amount": Decimal(row.target_amount),
                "progress_percentage": Decimal(row.progress_percentage),
                "status": str(row.status).upper(),
            }
            for row in goal_state_rows
        ]

        summary = self._normalize_summary(raw_summary, pool_states)
        return EngineResult(summary=summary, pool_states=pool_states, goal_states=goal_states)


def run(engine: BudgetEngine, budget_id: int) -> EngineResult:
    return engine.recalculate(budget_id)
