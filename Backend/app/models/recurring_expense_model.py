from sqlalchemy import (
    Enum as SAEnum,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.enums import CurrencyEnum, RecurrenceFrequency, RecurringExpenseStatus, SplitType


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)

    title = Column(String(120), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(SAEnum(CurrencyEnum, name="currency_enum"), default=CurrencyEnum.PLN, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    split_type = Column(SAEnum(SplitType, name="split_type"), nullable=True)

    frequency = Column(SAEnum(RecurrenceFrequency, name="recurrence_frequency"), nullable=False)
    interval_count = Column(Integer, nullable=False, default=1)
    day_of_month = Column(Integer, nullable=True)
    day_of_week = Column(Integer, nullable=True)
    starts_on = Column(Date, nullable=False)
    ends_on = Column(Date, nullable=True)
    next_due_on = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)

    status = Column(
        SAEnum(RecurringExpenseStatus, name="recurring_expense_status"),
        default=RecurringExpenseStatus.ACTIVE,
        nullable=False,
    )
    last_generated_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="recurring_expenses")
    group = relationship("Group", back_populates="recurring_expenses")
    category = relationship("Category", back_populates="recurring_expenses")
    expenses = relationship("Expense", back_populates="recurring_expense")
    participants = relationship(
        "RecurringExpenseParticipant",
        back_populates="recurring_expense",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("idx_recurring_expenses_status_next_due_on", "status", "next_due_on"),
        Index("idx_recurring_expenses_user_status", "user_id", "status"),
        Index("idx_recurring_expenses_group_status", "group_id", "status"),
        CheckConstraint("interval_count > 0", name="check_recurring_interval_positive"),
        CheckConstraint(
            "(ends_on IS NULL) OR (ends_on >= starts_on)",
            name="check_recurring_ends_on_after_starts_on",
        ),
        CheckConstraint(
            "(day_of_month IS NULL) OR (day_of_month BETWEEN 1 AND 31)",
            name="check_recurring_day_of_month_range",
        ),
        CheckConstraint(
            "(day_of_week IS NULL) OR (day_of_week BETWEEN 0 AND 6)",
            name="check_recurring_day_of_week_range",
        ),
        CheckConstraint(
            "(group_id IS NULL AND split_type IS NULL) OR (group_id IS NOT NULL AND split_type IS NOT NULL)",
            name="check_recurring_split_type_group",
        ),
    )