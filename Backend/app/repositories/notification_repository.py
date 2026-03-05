from sqlalchemy.orm import Session
from app.models import Notification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db


    def create(self, notification: Notification):
        self.db.add(notification)


    def refresh(self, notification: Notification):
        self.db.refresh(notification)