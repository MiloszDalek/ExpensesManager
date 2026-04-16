from sqlalchemy import Column, Date, DateTime, Enum as SAEnum, ForeignKey, Index, Integer, Numeric, String, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.enums import BudgetAllocationStrategy, BudgetPeriodType, BudgetStatus, CurrencyEnum


class BudgetPlan(Base):
    __tablename__ = "budget_plans"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(120), nullable=False)
    currency = Column(SAEnum(CurrencyEnum, name="currency_enum"), default=CurrencyEnum.PLN, nullable=False)
    period_type = Column(SAEnum(BudgetPeriodType, name="budget_period_type"), nullable=False)
    allocation_strategy = Column(
        SAEnum(BudgetAllocationStrategy, name="budget_allocation_strategy"),
        default=BudgetAllocationStrategy.PERCENT_INCOME,
        nullable=False,
    )
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    income_target = Column(Numeric(12, 2), nullable=True)
    status = Column(SAEnum(BudgetStatus, name="budget_status"), default=BudgetStatus.ACTIVE, nullable=False)
    template_key = Column(String(40), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="budget_plans")
    pools = relationship("BudgetPool", back_populates="budget", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (
        Index("idx_budget_plans_user_status", "user_id", "status"),
        Index("idx_budget_plans_user_period", "user_id", "period_start", "period_end"),
        CheckConstraint("period_end >= period_start", name="check_budget_plan_period"),
    )
