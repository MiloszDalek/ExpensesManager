from sqlalchemy import UniqueConstraint, Index, Column, Integer, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.database import Base


class ExpenseShare(Base):
    __tablename__ = "expense_shares"

    id = Column(Integer, primary_key=True)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    share_amount = Column(Numeric(12, 2), nullable=False)

    expense = relationship("Expense", back_populates="shares")
    user = relationship("User", back_populates="expense_shares")


    __table_args__ = (
        UniqueConstraint("expense_id", "user_id", name="uq_expense_user"),
        Index("idx_expense_shares_user", "user_id"),
    )