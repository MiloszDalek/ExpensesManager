from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.enums import NotificationType


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: NotificationType
    message: str | None
    action_url: str | None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)