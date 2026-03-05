from sqlalchemy.orm import Session
from app.models import Notification


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
    

    def get_unread_count(self, user_id: int) -> int:
        return (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
            .count()
        )


    def create(self, notification: Notification):
        self.db.add(notification)
        self.db.flush()


    def refresh(self, notification: Notification):
        self.db.refresh(notification)

    
    def save_all(self):
        self.db.commit()