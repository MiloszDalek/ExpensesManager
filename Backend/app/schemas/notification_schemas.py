from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.enums import NotificationType
from typing import Optional


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: NotificationType
    message: Optional[str] = None
    action_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadNotificationCountResponse(BaseModel):
    count: int