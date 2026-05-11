from sqlalchemy import Column, Integer, Index, Text, ForeignKey, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.enums import NotificationSeverity, NotificationType, NotificationContextType, NotificationStatus
import json


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(NotificationType, name="notification_type"), nullable=False)
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(Enum(NotificationContextType, name="notification_context_type"), nullable=True)
    message = Column(Text, nullable=True)
    message_key = Column(Text, nullable=True)
    context = Column(Text, nullable=True)
    status = Column(Enum(NotificationStatus, name="notification_status"), default=NotificationStatus.UNREAD, nullable=False)
    severity = Column(Enum(NotificationSeverity, name="notification_severity"), default=NotificationSeverity.INFO)
    action_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_user_created", "user_id", "created_at"),
        Index("ix_notifications_user_status", "user_id", "status"),
    )

    @property
    def context_dict(self):
        if self.context is None:
            return None
        try:
            return json.loads(self.context)
        except (json.JSONDecodeError, TypeError):
            return None
