from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories import NotificationRepository
from app.models import Notification
from app.enums import (
    NotificationSeverity, 
    NotificationType, 
    NotificationContextType,
    NotificationStatus
)
from typing import Optional


# Severity mapping for notification types
SEVERITY_MAP = {
    # INFO
    NotificationType.INVITATION_RECEIVED: NotificationSeverity.INFO,
    NotificationType.INVITATION_ACCEPTED: NotificationSeverity.INFO,
    NotificationType.NEW_EXPENSE_ADDED: NotificationSeverity.INFO,
    NotificationType.EXPENSE_UPDATED: NotificationSeverity.INFO,
    NotificationType.RECURRING_EXECUTED: NotificationSeverity.INFO,
    NotificationType.GOAL_PROGRESS: NotificationSeverity.INFO,
    NotificationType.SETTLEMENT_COMPLETED: NotificationSeverity.INFO,
    NotificationType.BUDGET_RESET: NotificationSeverity.INFO,
    
    # WARNING
    NotificationType.BUDGET_NEAR_LIMIT: NotificationSeverity.WARNING,
    NotificationType.RECURRING_DUE_SOON: NotificationSeverity.WARNING,
    NotificationType.HIGH_SPENDING_CATEGORY: NotificationSeverity.WARNING,
    NotificationType.INVITATION_REJECTED: NotificationSeverity.WARNING,
    
    # URGENT
    NotificationType.BUDGET_EXCEEDED: NotificationSeverity.URGENT,
    NotificationType.SETTLEMENT_PENDING: NotificationSeverity.URGENT,
    NotificationType.RECURRING_FAILED: NotificationSeverity.URGENT,
    NotificationType.UNUSUAL_SPENDING: NotificationSeverity.URGENT,
    NotificationType.SETTLEMENT_FAILED: NotificationSeverity.URGENT,
    
    # Legacy support
    NotificationType.INVITATION: NotificationSeverity.INFO,
    NotificationType.BUDGET_OVERSPENDING: NotificationSeverity.URGENT,
    NotificationType.UPCOMING_RECURRING_EXPENSE: NotificationSeverity.WARNING,
}


class NotificationService:
    def __init__(self, db: Session):
        self.notification_repo = NotificationRepository(db)

    def get_user_notifications(self, user_id: int, limit: int, offset: int) -> list[Notification]:
        return self.notification_repo.get_all_by_user_id(user_id, limit, offset)
    
    def get_notifications_filtered(
        self,
        user_id: int,
        status: Optional[NotificationStatus] = None,
        type: Optional[NotificationType] = None,
        limit: int = 20,
        offset: int = 0
    ) -> list[Notification]:
        return self.notification_repo.get_by_user_filtered(user_id, status, type, limit, offset)

    def get_unread_count(self, user_id: int) -> dict:
        count = self.notification_repo.get_unread_count(user_id)
        return {"count": count}
    
    def mark_as_read(self, notification_id: int, user_id: int) -> Notification:
        notification = self.notification_repo.get_by_id(notification_id)

        if notification is None:
            raise HTTPException(status_code=404, detail="Notification not found")

        if notification.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        notification.status = NotificationStatus.READ
        self.notification_repo.save_all()
        
        return notification

    def mark_all_as_read(self, user_id: int) -> int:
        marked_count = self.notification_repo.mark_all_read_for_user(user_id)
        self.notification_repo.save_all()
        return marked_count

    def archive_notification(self, notification_id: int, user_id: int) -> Notification:
        notification = self.notification_repo.get_by_id(notification_id)

        if notification is None:
            raise HTTPException(status_code=404, detail="Notification not found")

        if notification.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        notification.status = NotificationStatus.ARCHIVED
        self.notification_repo.save_all()
        
        return notification

    def create_notification(
        self,
        user_id: int,
        type: NotificationType,
        reference_id: int | None = None,
        reference_type: NotificationContextType | None = None,
        message: str | None = None,
        action_url: str | None = None,
        severity: NotificationSeverity | None = None,
    ) -> Notification:
        if severity is None:
            severity = self.determine_severity(type)
        
        notification = Notification(
            user_id=user_id,
            type=type,
            reference_id=reference_id,
            reference_type=reference_type,
            message=message,
            action_url=action_url,
            severity=severity,
            status=NotificationStatus.UNREAD,
        )
        self.notification_repo.create(notification)
        return notification

    def determine_severity(self, notification_type: NotificationType) -> NotificationSeverity:
        return SEVERITY_MAP.get(notification_type, NotificationSeverity.INFO)

    def notification_recently_sent(
        self,
        user_id: int,
        notification_type: NotificationType,
        reference_id: int | None = None,
        hours: int = 24
    ) -> bool:
        recent = self.notification_repo.get_recent_by_type(
            user_id=user_id,
            notification_type=notification_type,
            reference_id=reference_id,
            hours=hours
        )
        return len(recent) > 0

    # === Budget Notification Generators ===
    
    def notify_budget_near_limit(
        self,
        user_id: int,
        budget_id: int,
        pool_id: int,
        category_name: str,
        usage_percentage: float,
        spent_amount: float,
        allocated_amount: float
    ):
        if self.notification_recently_sent(
            user_id, NotificationType.BUDGET_NEAR_LIMIT, pool_id, hours=24
        ):
            return None
        
        message = f"Your {category_name} budget is at {usage_percentage:.1f}% ({spent_amount:.2f}/{allocated_amount:.2f})"
        action_url = f"/budgets?budget_id={budget_id}"
        
        return self.create_notification(
            user_id=user_id,
            type=NotificationType.BUDGET_NEAR_LIMIT,
            reference_id=pool_id,
            reference_type=NotificationContextType.BUDGET,
            message=message,
            action_url=action_url,
        )

    def notify_budget_exceeded(
        self,
        user_id: int,
        budget_id: int,
        pool_id: int,
        category_name: str,
        spent_amount: float,
        allocated_amount: float
    ):
        if self.notification_recently_sent(
            user_id, NotificationType.BUDGET_EXCEEDED, pool_id, hours=24
        ):
            return None
        
        message = f"You've exceeded your {category_name} budget: {spent_amount:.2f}/{allocated_amount:.2f}"
        action_url = f"/budgets?budget_id={budget_id}"
        
        return self.create_notification(
            user_id=user_id,
            type=NotificationType.BUDGET_EXCEEDED,
            reference_id=pool_id,
            reference_type=NotificationContextType.BUDGET,
            message=message,
            action_url=action_url,
        )

    # === Recurring Expense Notification Generators ===
    
    def notify_recurring_due_soon(
        self,
        user_id: int,
        recurring_id: int,
        recurring_name: str,
        days_until_due: int
    ):
        if self.notification_recently_sent(
            user_id, NotificationType.RECURRING_DUE_SOON, recurring_id, hours=72
        ):
            return None
        
        message = f"{recurring_name} is due in {days_until_due} day{'s' if days_until_due != 1 else ''}"
        action_url = "/personal?tab=recurring"
        
        return self.create_notification(
            user_id=user_id,
            type=NotificationType.RECURRING_DUE_SOON,
            reference_id=recurring_id,
            reference_type=NotificationContextType.RECURRING,
            message=message,
            action_url=action_url,
        )

    def notify_recurring_executed(
        self,
        user_id: int,
        recurring_id: int,
        recurring_name: str,
        amount: float
    ):
        message = f"{recurring_name} expense of {amount:.2f} has been automatically added"
        action_url = "/personal"
        
        return self.create_notification(
            user_id=user_id,
            type=NotificationType.RECURRING_EXECUTED,
            reference_id=recurring_id,
            reference_type=NotificationContextType.RECURRING,
            message=message,
            action_url=action_url,
        )

    def notify_recurring_failed(
        self,
        user_id: int,
        recurring_id: int,
        recurring_name: str,
        error_message: str
    ):
        message = f"Failed to create recurring expense {recurring_name}: {error_message}"
        action_url = "/personal?tab=recurring"
        
        return self.create_notification(
            user_id=user_id,
            type=NotificationType.RECURRING_FAILED,
            reference_id=recurring_id,
            reference_type=NotificationContextType.RECURRING,
            message=message,
            action_url=action_url,
        )

    # === Settlement Notification Generators ===
    
    def notify_settlement_pending(
        self,
        user_id: int,
        settlement_id: int,
        amount: float,
        creditor_name: str
    ):
        message = f"You owe {amount:.2f} to {creditor_name}"
        action_url = f"/groups?settlement_id={settlement_id}"
        
        return self.create_notification(
            user_id=user_id,
            type=NotificationType.SETTLEMENT_PENDING,
            reference_id=settlement_id,
            reference_type=NotificationContextType.SETTLEMENT,
            message=message,
            action_url=action_url,
        )

    def notify_settlement_completed(
        self,
        user_id: int,
        settlement_id: int,
        amount: float,
        debtor_name: str
    ):
        message = f"{debtor_name} has settled {amount:.2f} with you"
        action_url = "/groups"
        
        return self.create_notification(
            user_id=user_id,
            type=NotificationType.SETTLEMENT_COMPLETED,
            reference_id=settlement_id,
            reference_type=NotificationContextType.SETTLEMENT,
            message=message,
            action_url=action_url,
        )

    # === Group Expense Notification Generators ===
    
    def notify_new_group_expense(
        self,
        user_id: int,
        expense_id: int,
        group_id: int,
        payer_name: str,
        amount: float,
        group_name: str,
        description: str | None = None
    ):
        desc_part = f": {description}" if description else ""
        message = f"{payer_name} added {amount:.2f} expense in {group_name}{desc_part}"
        action_url = f"/groups/{group_id}"
        
        return self.create_notification(
            user_id=user_id,
            type=NotificationType.NEW_EXPENSE_ADDED,
            reference_id=expense_id,
            reference_type=NotificationContextType.EXPENSE,
            message=message,
            action_url=action_url,
        )

    # === Goal Notification Generators ===
    
    def notify_goal_progress(
        self,
        user_id: int,
        goal_id: int,
        goal_name: str,
        progress_percentage: float
    ):
        message = f"You're {progress_percentage:.0f}% towards your {goal_name} goal!"
        action_url = "/budgets?tab=goals"
        
        return self.create_notification(
            user_id=user_id,
            type=NotificationType.GOAL_PROGRESS,
            reference_id=goal_id,
            reference_type=NotificationContextType.GOAL,
            message=message,
            action_url=action_url,
        )

    def notify_goal_completed(
        self,
        user_id: int,
        goal_id: int,
        goal_name: str
    ):
        message = f"Congratulations! You've reached your {goal_name} goal!"
        action_url = "/budgets?tab=goals"
        
        return self.create_notification(
            user_id=user_id,
            type=NotificationType.GOAL_COMPLETED,
            reference_id=goal_id,
            reference_type=NotificationContextType.GOAL,
            message=message,
            action_url=action_url,
        )

    def refresh(self, notification: Notification):
        self.notification_repo.refresh(notification)
