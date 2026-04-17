from sqlalchemy import Boolean, CheckConstraint, Column, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    budget_pool_id = Column(Integer, ForeignKey("budget_pools.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(120), nullable=False)
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_amount = Column(Numeric(12, 2), nullable=False, default=0)
    deadline = Column(Date, nullable=True)
    auto_allocate_amount = Column(Numeric(12, 2), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="savings_goals")
    budget_pool = relationship("BudgetPool", back_populates="savings_goals")
    allocations = relationship("SavingsGoalAllocation", back_populates="goal", cascade="all, delete-orphan")
    state = relationship("GoalState", back_populates="goal", uselist=False, cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (
        CheckConstraint("target_amount > 0", name="check_savings_goal_target_positive"),
        CheckConstraint("current_amount >= 0", name="check_savings_goal_current_non_negative"),
        CheckConstraint(
            "auto_allocate_amount IS NULL OR auto_allocate_amount >= 0",
            name="check_savings_goal_auto_allocate_non_negative",
        ),
    )
