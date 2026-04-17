from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.database import Base


class GoalState(Base):
    __tablename__ = "goal_states"

    goal_id = Column(Integer, ForeignKey("savings_goals.id", ondelete="CASCADE"), primary_key=True)
    budget_id = Column(Integer, ForeignKey("budget_plans.id", ondelete="SET NULL"), nullable=True)
    current_amount = Column(Numeric(12, 2), nullable=False, default=0)
    target_amount = Column(Numeric(12, 2), nullable=False, default=0)
    progress_percentage = Column(Numeric(7, 2), nullable=False, default=0)
    status = Column(String(16), nullable=False)
    last_recalculated_at = Column(DateTime(timezone=True), nullable=False)

    goal = relationship("SavingsGoal", back_populates="state")
    budget = relationship("BudgetPlan")

    __table_args__ = (
        CheckConstraint(
            "status IN ('ACTIVE', 'COMPLETED', 'PAUSED')",
            name="check_goal_states_status",
        ),
    )
