from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from app.models import Notification
from app.enums import NotificationStatus, NotificationType


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, notification_id) -> Notification | None:
        return self.db.query(Notification).filter(Notification.id == notification_id).first()

    def get_all_by_user_id(self, user_id: int, limit: int, offset: int):
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    def get_by_user_filtered(
        self,
        user_id: int,
        status: NotificationStatus | None = None,
        type: NotificationType | None = None,
        limit: int = 20,
        offset: int = 0
    ) -> list[Notification]:
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        
        if status is not None:
            query = query.filter(Notification.status == status)
        
        if type is not None:
            query = query.filter(Notification.type == type)
        
        return (
            query
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    def get_unread_count(self, user_id: int) -> int:
        return (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.status == NotificationStatus.UNREAD
            )
            .count()
        )

    def mark_all_read_for_user(self, user_id: int) -> int:
        result = (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.status == NotificationStatus.UNREAD
            )
            .update({"status": NotificationStatus.READ}, synchronize_session=False)
        )
        self.db.flush()
        return result

    def get_recent_by_type(
        self,
        user_id: int,
        notification_type: NotificationType,
        reference_id: int | None = None,
        hours: int = 24
    ) -> list[Notification]:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        query = self.db.query(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.type == notification_type,
                Notification.created_at >= cutoff_time
            )
        )
        
        if reference_id is not None:
            query = query.filter(Notification.reference_id == reference_id)
        
        return query.all()

    def create(self, notification: Notification):
        self.db.add(notification)
        self.db.flush()

    def refresh(self, notification: Notification):
        self.db.refresh(notification)

    def save_all(self):
        self.db.commit()