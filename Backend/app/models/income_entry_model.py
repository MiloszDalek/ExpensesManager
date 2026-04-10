from sqlalchemy import CheckConstraint, Column, DateTime, Enum as SAEnum, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.enums import CurrencyEnum


class IncomeEntry(Base):
    __tablename__ = "income_entries"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(120), nullable=False)
    source = Column(String(120), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(SAEnum(CurrencyEnum, name="currency_enum"), default=CurrencyEnum.PLN, nullable=False)
    income_date = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="income_entries")

    __table_args__ = (
        Index("idx_income_entries_user_date", "user_id", "income_date"),
        CheckConstraint("amount > 0", name="check_income_entry_amount_positive"),
    )
