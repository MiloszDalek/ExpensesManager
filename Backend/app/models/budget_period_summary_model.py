from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import relationship

from app.database import Base


class BudgetPeriodSummary(Base):
    __tablename__ = "budget_period_summaries"

    budget_id = Column(Integer, ForeignKey("budget_plans.id", ondelete="CASCADE"), primary_key=True)
    total_income = Column(Numeric(12, 2), nullable=False, default=0)
    total_expenses = Column(Numeric(12, 2), nullable=False, default=0)
    total_savings = Column(Numeric(12, 2), nullable=False, default=0)
    remaining_budget = Column(Numeric(12, 2), nullable=False, default=0)
    overspend_flag = Column(Boolean, nullable=False, default=False)
    last_recalculated_at = Column(DateTime(timezone=True), nullable=False)

    budget = relationship("BudgetPlan", back_populates="period_summary")
