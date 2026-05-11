from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from app.enums import NotificationType, NotificationContextType, NotificationStatus, NotificationSeverity
from typing import Optional, Dict, Any
import json


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: NotificationType
    reference_id: Optional[int] = None
    reference_type: Optional[NotificationContextType] = None
    message: Optional[str] = None
    message_key: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    status: NotificationStatus
    severity: NotificationSeverity
    action_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator('context', mode='before')
    @classmethod
    def parse_context(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v


class UnreadNotificationCountResponse(BaseModel):
    count: int


class MarkAllReadResponse(BaseModel):
    marked_count: int