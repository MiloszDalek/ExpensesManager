from sqlalchemy.orm import Session, selectinload

from app.models import SavingsGoal, SavingsGoalAllocation


class SavingsGoalRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_goal(self, goal: SavingsGoal) -> SavingsGoal:
        self.db.add(goal)
        self.db.flush()
        return goal

    def create_allocation(self, allocation: SavingsGoalAllocation) -> SavingsGoalAllocation:
        self.db.add(allocation)
        self.db.flush()
        return allocation

    def list_goals_by_user(self, user_id: int, include_inactive: bool = False) -> list[SavingsGoal]:
        query = (
            self.db.query(SavingsGoal)
            .options(selectinload(SavingsGoal.budget_pool))
            .filter(SavingsGoal.user_id == user_id)
        )

        if not include_inactive:
            query = query.filter(SavingsGoal.is_active.is_(True))

        return query.order_by(SavingsGoal.created_at.desc(), SavingsGoal.id.desc()).all()

    def list_auto_active_goals_by_user(self, user_id: int) -> list[SavingsGoal]:
        return (
            self.db.query(SavingsGoal)
            .options(selectinload(SavingsGoal.budget_pool))
            .filter(
                SavingsGoal.user_id == user_id,
                SavingsGoal.is_active.is_(True),
                SavingsGoal.auto_allocate_amount.isnot(None),
                SavingsGoal.auto_allocate_amount > 0,
            )
            .order_by(SavingsGoal.created_at.asc(), SavingsGoal.id.asc())
            .all()
        )

    def get_goal_by_id_for_user(self, goal_id: int, user_id: int) -> SavingsGoal | None:
        return (
            self.db.query(SavingsGoal)
            .options(selectinload(SavingsGoal.budget_pool), selectinload(SavingsGoal.allocations))
            .filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == user_id)
            .first()
        )

    def has_auto_allocation_for_budget(self, goal_id: int, budget_id: int) -> bool:
        return (
            self.db.query(SavingsGoalAllocation)
            .filter(
                SavingsGoalAllocation.goal_id == goal_id,
                SavingsGoalAllocation.budget_id == budget_id,
                SavingsGoalAllocation.allocation_type == "auto",
            )
            .first()
            is not None
        )

    def delete_goal(self, goal: SavingsGoal):
        self.db.delete(goal)
        self.db.flush()

    def save_all(self):
        self.db.commit()

    def refresh(self, goal: SavingsGoal):
        self.db.refresh(goal)
