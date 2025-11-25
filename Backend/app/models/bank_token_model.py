from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, Text, func
from sqlalchemy.orm import relationship
from app.database import Base


class BankToken(Base):
    __tablename__ = "bank_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    provider = Column(String(50), default="GoCardless")
    bank_name = Column(String(100))
    account_id = Column(String(100))
    account_mask = Column(String(10))
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text)
    expires_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bank_tokens")
