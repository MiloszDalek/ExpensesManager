from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SavingsGoalAllocation(Base):
    __tablename__ = "savings_goal_allocations"

    id = Column(Integer, primary_key=True)
    goal_id = Column(Integer, ForeignKey("savings_goals.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    budget_id = Column(Integer, ForeignKey("budget_plans.id", ondelete="SET NULL"), nullable=True)
    budget_pool_id = Column(Integer, ForeignKey("budget_pools.id", ondelete="SET NULL"), nullable=True)

    amount = Column(Numeric(12, 2), nullable=False)
    allocation_type = Column(String(12), nullable=False)
    notes = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    goal = relationship("SavingsGoal", back_populates="allocations")
    user = relationship("User")
    budget = relationship("BudgetPlan")
    budget_pool = relationship("BudgetPool")

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_savings_goal_allocation_amount_positive"),
        CheckConstraint(
            "allocation_type IN ('manual', 'auto')",
            name="check_savings_goal_allocation_type",
        ),
    )
