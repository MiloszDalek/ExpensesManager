from sqlalchemy import Enum as SAEnum, Column, Integer, ForeignKey, DateTime, Numeric, String, func, Index, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.enums import CurrencyEnum, PaymentMethod, SettlementStatus


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True)
    from_user_id = Column(Integer, ForeignKey("users.id"))
    to_user_id = Column(Integer, ForeignKey("users.id"))
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"))
    amount = Column(Numeric, nullable=False)
    currency = Column(SAEnum(CurrencyEnum, name="currency_enum"), default=CurrencyEnum.PLN, nullable=False)
    payment_method = Column(SAEnum(PaymentMethod, name="payment_method"), default=PaymentMethod.CASH, nullable=False)
    status = Column(SAEnum(SettlementStatus, name="settlement_status"), default=SettlementStatus.COMPLETED, nullable=False)
    transaction_id = Column(String(255))
    paypal_order_id = Column(String(255), nullable=True)
    paypal_capture_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="settlements")
    from_user = relationship("User", foreign_keys=[from_user_id], back_populates="sent_settlements")
    to_user = relationship( "User", foreign_keys=[to_user_id], back_populates="received_settlements")

    __table_args__ = (
        Index("idx_settlements_group", "group_id"),
        Index("idx_settlements_from_user", "from_user_id"),
        Index("idx_settlements_to_user", "to_user_id"),
        Index("idx_settlements_paypal_order_id", "paypal_order_id"),

        CheckConstraint("from_user_id != to_user_id", name="check_no_self_settlement")
    )
