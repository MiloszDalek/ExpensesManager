from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import NotificationService
from app.schemas import NotificationResponse, UnreadNotificationCountResponse
from app.models import User
from app.utils.auth_dependencies import get_current_active_user


notification_router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

def get_notification_service(db: Session = Depends(get_db)):
    return NotificationService(db)


@notification_router.get("", response_model=list[NotificationResponse])
def get_notification(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service),
):
    return service.get_user_notifications(current_user.id, limit, offset)


@notification_router.get("unread-count", response_model=UnreadNotificationCountResponse)
def get_unread_notifacations_count(
    current_user: User = Depends(get_current_active_user),
    service: NotificationService = Depends(get_notification_service),
):
    return service.get_unread_count(current_user.id)