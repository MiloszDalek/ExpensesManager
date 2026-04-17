from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class BudgetPoolState(Base):
    __tablename__ = "budget_pool_states"

    id = Column(Integer, primary_key=True)
    budget_id = Column(Integer, ForeignKey("budget_plans.id", ondelete="CASCADE"), nullable=False)
    pool_id = Column(Integer, ForeignKey("budget_pools.id", ondelete="CASCADE"), nullable=False)
    allocated_amount = Column(Numeric(12, 2), nullable=False, default=0)
    spent_amount = Column(Numeric(12, 2), nullable=False, default=0)
    remaining_amount = Column(Numeric(12, 2), nullable=False, default=0)
    usage_percentage = Column(Numeric(7, 2), nullable=True)
    status = Column(String(16), nullable=False)
    last_recalculated_at = Column(DateTime(timezone=True), nullable=False)

    budget = relationship("BudgetPlan", back_populates="pool_states")
    pool = relationship("BudgetPool", back_populates="state_rows")

    __table_args__ = (
        UniqueConstraint("budget_id", "pool_id", name="uq_budget_pool_states_budget_pool"),
        CheckConstraint(
            "status IN ('ON_TRACK', 'WARNING', 'EXCEEDED')",
            name="check_budget_pool_states_status",
        ),
    )
