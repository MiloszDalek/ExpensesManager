from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services import NotificationService
from app.schemas import NotificationResponse, UnreadNotificationCountResponse, MarkAllReadResponse
from app.models import User
from app.enums import NotificationStatus, NotificationType
from app.utils.auth_dependencies import get_current_active_user


notification_router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

def get_notification_service(db: Session = Depends(get_db)):
    return NotificationService(db)


@notification_router.get("", response_model=list[NotificationResponse])
def get_notifications(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_user_notifications(current_user.id, limit, offset)


@notification_router.get("/filtered", response_model=list[NotificationResponse])
def get_notifications_filtered(
    status: Optional[NotificationStatus] = Query(None),
    type: Optional[NotificationType] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_notifications_filtered(current_user.id, status, type, limit, offset)


@notification_router.get("/unread-count", response_model=UnreadNotificationCountResponse)
def get_unread_notifacations_count(
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_unread_count(current_user.id)


@notification_router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_as_read(
    notification_id: int,
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.mark_as_read(notification_id, current_user.id)


@notification_router.patch("/mark-all-read", response_model=MarkAllReadResponse)
def mark_all_as_read(
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_active_user),
):
    marked_count = service.mark_all_as_read(current_user.id)
    return {"marked_count": marked_count}


@notification_router.patch("/{notification_id}/archive", response_model=NotificationResponse)
def archive_notification(
    notification_id: int,
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.archive_notification(notification_id, current_user.id)