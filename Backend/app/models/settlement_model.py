from sqlalchemy import CHAR, Column, Integer, ForeignKey, DateTime, Numeric, String, func
from sqlalchemy.orm import relationship
from app.database import Base


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True)
    from_user_id = Column(Integer, ForeignKey("users.id"))
    to_user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Numeric, nullable=False)
    currency = Column(CHAR(3), default="USD")
    payment_method = Column(String(50))
    transaction_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    from_user = relationship(
        "User",
        foreign_keys=[from_user_id],
        back_populates="sent_settlements"
    )
    to_user = relationship(
        "User",
        foreign_keys=[to_user_id],
        back_populates="received_settlements"
    )
