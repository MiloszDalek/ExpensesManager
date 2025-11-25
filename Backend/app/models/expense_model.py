from sqlalchemy import CHAR, Column, Index, Integer, Numeric, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="SET NULL"))
    payer_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(120), nullable=False)
    amount = Column(Numeric, nullable=False)
    is_personal = Column(Boolean, default=True)
    currency = Column(CHAR(3), default="PLN")
    category = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    receipt_image_url = Column(Text)
    receipt_text = Column(Text)

    group = relationship("Group", back_populates="expenses")
    payer = relationship("User", back_populates="expenses")
    shares = relationship("ExpenseShare", back_populates="expense")


Index("idx_expenses_group_id", Expense.group_id)
Index("idx_expenses_payer_id", Expense.payer_id)
Index("idx_expenses_category", Expense.category)
