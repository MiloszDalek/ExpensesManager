from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class BudgetRollover(Base):
    __tablename__ = "budget_rollovers"

    id = Column(Integer, primary_key=True)
    from_budget_id = Column(Integer, ForeignKey("budget_plans.id", ondelete="CASCADE"), nullable=False)
    to_budget_id = Column(Integer, ForeignKey("budget_plans.id", ondelete="CASCADE"), nullable=False)
    from_pool_id = Column(Integer, ForeignKey("budget_pools.id", ondelete="SET NULL"), nullable=True)
    to_pool_id = Column(Integer, ForeignKey("budget_pools.id", ondelete="SET NULL"), nullable=True)

    rollover_amount = Column(Numeric(12, 2), nullable=False)
    is_negative = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    from_budget = relationship("BudgetPlan", foreign_keys=[from_budget_id])
    to_budget = relationship("BudgetPlan", foreign_keys=[to_budget_id])
    from_pool = relationship("BudgetPool", foreign_keys=[from_pool_id])
    to_pool = relationship("BudgetPool", foreign_keys=[to_pool_id])
