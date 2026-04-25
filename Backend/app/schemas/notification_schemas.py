from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.enums import NotificationType, NotificationContextType, NotificationStatus, NotificationSeverity
from typing import Optional


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: NotificationType
    reference_id: Optional[int] = None
    reference_type: Optional[NotificationContextType] = None
    message: Optional[str] = None
    status: NotificationStatus
    severity: NotificationSeverity
    action_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadNotificationCountResponse(BaseModel):
    count: int


class MarkAllReadResponse(BaseModel):
    marked_count: int