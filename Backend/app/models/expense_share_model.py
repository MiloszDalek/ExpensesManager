from sqlalchemy import CHAR, Column, Integer, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.database import Base


class ExpenseShare(Base):
    __tablename__ = "expense_shares"

    id = Column(Integer, primary_key=True)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    share_amount = Column(Numeric, nullable=False)
    currency = Column(CHAR(3), default="PLN")

    expense = relationship("Expense", back_populates="shares")
    user = relationship("User", back_populates="expense_shares")
