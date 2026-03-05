from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories import NotificationRepository
from app.models import Notification
from app.enums import NotificationSeverity


class NotificationService:
    def __init__(self, db: Session):
        self.notification_repo = NotificationRepository(db)


    def get_user_notifications(self, user_id: int, limit: int, offset: int) ->list[Notification]:
        return self.notification_repo.get_all_by_user_id(user_id, limit, offset)
    

    def get_unread_count(self, user_id: int) -> int:
        count = self.notification_repo.get_unread_count(user_id)
        return {"count": count}
    

    def mark_as_read(self, notification_id: int, user_id: int) -> Notification:
        notification = self.notification_repo.get_by_id(notification_id)

        if notification is None:
            raise HTTPException(status_code=404, detail="Notification not found")

        if notification.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        notification.is_read = True

        self.notification_repo.save_all()
        
        return notification

    def create_notification(
        self,
        user_id: int,
        type: str,
        reference_id: int | None = None,
        message: str | None = None,
        action_url: str | None = None,
        severity: NotificationSeverity = NotificationSeverity.INFO,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            reference_id=reference_id,
            message=message,
            action_url=action_url,
            severity=severity,
        )
        self.notification_repo.create(notification)
        return notification
    

    def refresh(self, notification: Notification):
        self.notification_repo.refresh(notification)