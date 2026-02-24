from sqlalchemy import Enum as SAEnum, CHAR, Column, Index, Integer, Numeric, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.enums import CurrencyEnum


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="SET NULL"))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(120), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    is_personal = Column(Boolean, default=True)
    currency = Column(SAEnum(CurrencyEnum, name="currency_enum"), default=CurrencyEnum.PLN)
    category_id = Column(ForeignKey("categories.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expense_date = Column(DateTime, nullable=False)
    notes = Column(Text)
    receipt_image_url = Column(Text)
    receipt_text = Column(Text)

    group = relationship("Group", back_populates="expenses")
    user = relationship("User", back_populates="expenses")
    shares = relationship("ExpenseShare", back_populates="expense")
    category = relationship("Category", back_populates="expenses")


Index("idx_expenses_group_id", Expense.group_id)
Index("idx_expenses_user_id", Expense.user_id)
Index("idx_expenses_category", Expense.category_id)
