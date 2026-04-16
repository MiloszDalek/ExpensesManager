from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Enum as SAEnum, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.enums import BudgetPoolType


class BudgetPool(Base):
    __tablename__ = "budget_pools"

    id = Column(Integer, primary_key=True)
    budget_id = Column(Integer, ForeignKey("budget_plans.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    name = Column(String(120), nullable=False)
    pool_type = Column(SAEnum(BudgetPoolType, name="budget_pool_type"), nullable=False)
    target_value = Column(Numeric(12, 2), nullable=False)
    alert_threshold = Column(Numeric(5, 2), nullable=False, default=80)
    allocated_amount = Column(Numeric(12, 2), nullable=False, default=0)
    spent_amount = Column(Numeric(12, 2), nullable=False, default=0)
    remaining_amount = Column(Numeric(12, 2), nullable=False, default=0)
    rollover_amount = Column(Numeric(12, 2), nullable=False, default=0)
    rollover_enabled = Column(Boolean, nullable=False, default=True)
    rollover_negative_enabled = Column(Boolean, nullable=False, default=False)
    last_recalculated_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    budget = relationship("BudgetPlan", back_populates="pools")
    category = relationship("Category", back_populates="budget_pools")
    savings_goals = relationship("SavingsGoal", back_populates="budget_pool")

    __table_args__ = (
        Index("idx_budget_pools_budget_id", "budget_id"),
        CheckConstraint("target_value > 0", name="check_budget_pool_target_positive"),
        CheckConstraint(
            "alert_threshold > 0 AND alert_threshold <= 100",
            name="check_budget_pool_alert_threshold_range",
        ),
    )
