from sqlalchemy import Enum as SAEnum, Column, Integer, Numeric, String, ForeignKey, Date, DateTime, Text, Index, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.enums import CurrencyEnum, SplitType


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(120), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(SAEnum(CurrencyEnum, name="currency_enum"), default=CurrencyEnum.PLN, nullable=False)
    split_type = Column(SAEnum(SplitType, name="split_type"), nullable=True)
    category_id = Column(ForeignKey("categories.id"), nullable=False)
    recurring_expense_id = Column(Integer, ForeignKey("recurring_expenses.id", ondelete="SET NULL"), nullable=True)
    recurring_occurrence_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expense_date = Column(DateTime, nullable=False)
    notes = Column(Text)
    receipt_image_url = Column(Text)
    receipt_text = Column(Text)

    group = relationship("Group", back_populates="expenses")
    user = relationship("User", back_populates="expenses")
    shares = relationship("ExpenseShare", back_populates="expense", cascade="all, delete")
    category = relationship("Category", back_populates="expenses")
    recurring_expense = relationship("RecurringExpense", back_populates="expenses")


    __table_args__ = (
        Index("idx_expenses_group_id", "group_id"),
        Index("idx_expenses_user_id", "user_id"),
        Index("idx_expenses_category", "category_id"),
        Index("idx_expenses_expense_date", "expense_date"),
        Index("idx_expenses_user_group_expense_date", "user_id", "group_id", "expense_date"),
        Index("idx_expenses_recurring_expense_id", "recurring_expense_id"),
        Index("idx_expenses_recurring_occurrence_date", "recurring_occurrence_date"),
        Index(
            "uq_expenses_recurring_occurrence",
            "recurring_expense_id",
            "recurring_occurrence_date",
            unique=True,
            postgresql_where=recurring_expense_id.isnot(None),
        ),

        CheckConstraint(
            "(group_id IS NULL AND split_type IS NULL) OR (group_id IS NOT NULL AND split_type IS NOT NULL)",
            name="check_split_type_group"
        ),
        CheckConstraint(
            "(recurring_expense_id IS NULL AND recurring_occurrence_date IS NULL) OR (recurring_expense_id IS NOT NULL AND recurring_occurrence_date IS NOT NULL)",
            name="check_recurring_expense_occurrence"
        ),
    )