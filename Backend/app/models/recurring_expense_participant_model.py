from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class RecurringExpenseParticipant(Base):
    __tablename__ = "recurring_expense_participants"

    id = Column(Integer, primary_key=True)
    recurring_expense_id = Column(
        Integer,
        ForeignKey("recurring_expenses.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    share_amount = Column(Numeric(12, 2), nullable=True)
    share_percentage = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    recurring_expense = relationship("RecurringExpense", back_populates="participants")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint(
            "recurring_expense_id",
            "user_id",
            name="uq_recurring_expense_participant_user",
        ),
        Index("idx_recurring_expense_participants_user_id", "user_id"),
        CheckConstraint(
            "(share_amount IS NULL OR share_amount >= 0)",
            name="check_recurring_participant_share_amount_non_negative",
        ),
        CheckConstraint(
            "(share_percentage IS NULL OR (share_percentage >= 0 AND share_percentage <= 100))",
            name="check_recurring_participant_share_percentage_range",
        ),
        CheckConstraint(
            "(share_amount IS NOT NULL AND share_percentage IS NULL)"
            " OR (share_amount IS NULL AND share_percentage IS NOT NULL)"
            " OR (share_amount IS NULL AND share_percentage IS NULL)",
            name="check_recurring_participant_share_shape",
        ),
    )