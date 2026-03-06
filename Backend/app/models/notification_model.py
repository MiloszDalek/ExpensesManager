from sqlalchemy import Column, Integer, Index, Boolean, Text, ForeignKey, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.enums import NotificationSeverity, NotificationType


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(NotificationType, name="notification_type"), nullable=False)
    reference_id = Column(Integer, nullable=True)  # invitation or contact id 
    message = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    severity = Column(Enum(NotificationSeverity, name="notification_severity"), default=NotificationSeverity.INFO)
    action_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_user_created", "user_id", "created_at")
    )