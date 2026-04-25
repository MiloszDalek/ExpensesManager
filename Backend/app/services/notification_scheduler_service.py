import asyncio
import logging
from datetime import date, timedelta
from decimal import Decimal

from app.database import SessionLocal


logger = logging.getLogger(__name__)


class NotificationScheduler:
    def __init__(self, interval_seconds: int = 3600):
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._stop_event: asyncio.Event | None = None

    async def start(self):
        if self._task and not self._task.done():
            return

        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run_loop(), name="notification-scheduler")
        logger.info("Notification scheduler started (interval=%ss)", self.interval_seconds)

    async def stop(self):
        if not self._task:
            return

        if self._stop_event is not None:
            self._stop_event.set()

        try:
            await self._task
        except Exception:
            logger.exception("Notification scheduler stopped with an exception")
        finally:
            self._task = None
            self._stop_event = None

    async def _run_loop(self):
        while self._stop_event is not None and not self._stop_event.is_set():
            db = SessionLocal()
            try:
                summary = {
                    "budget_alerts": 0,
                    "recurring_alerts": 0,
                    "settlement_alerts": 0,
                    "goal_milestones": 0,
                }

                summary["budget_alerts"] = self._check_budget_alerts(db)
                summary["recurring_alerts"] = self._check_recurring_alerts(db)
                summary["settlement_alerts"] = self._check_settlement_alerts(db)
                summary["goal_milestones"] = self._check_goal_milestones(db)

                total_notifications = sum(summary.values())
                if total_notifications > 0:
                    logger.info(
                        "Notification scheduler sent=%s (budgets=%s, recurring=%s, settlements=%s, goals=%s)",
                        total_notifications,
                        summary["budget_alerts"],
                        summary["recurring_alerts"],
                        summary["settlement_alerts"],
                        summary["goal_milestones"],
                    )
            except Exception:
                logger.exception("Notification scheduler iteration failed")
            finally:
                db.close()

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=self.interval_seconds)
            except asyncio.TimeoutError:
                continue

    def _check_budget_alerts(self, db) -> int:
        """Check budget pool states and send alerts for warnings/exceeded budgets."""
        from app.services.notification_service import NotificationService
        from app.repositories.budget_repository import BudgetRepository
        from app.enums import BudgetStatus

        notification_service = NotificationService(db)
        budget_repo = BudgetRepository(db)

        notifications_sent = 0

        try:
            # Get all active budget plans
            from app.models import BudgetPlan
            active_budgets = (
                db.query(BudgetPlan)
                .filter(BudgetPlan.status == BudgetStatus.ACTIVE)
                .all()
            )

            for budget in active_budgets:
                pool_states = budget_repo.list_budget_pool_states(budget.id)
                
                for state in pool_states:
                    pool = next((p for p in budget.pools if p.id == state.pool_id), None)
                    if not pool:
                        continue

                    category_name = pool.category.name if pool.category else f"Pool {pool.id}"
                    
                    # Check for exceeded budget
                    if state.status == "EXCEEDED":
                        result = notification_service.notify_budget_exceeded(
                            user_id=budget.user_id,
                            budget_id=budget.id,
                            pool_id=state.pool_id,
                            category_name=category_name,
                            spent_amount=float(state.spent_amount),
                            allocated_amount=float(state.allocated_amount)
                        )
                        if result:
                            notifications_sent += 1
                    
                    # Check for warning (near limit)
                    elif state.status == "WARNING" and state.usage_percentage:
                        if float(state.usage_percentage) >= float(pool.alert_threshold):
                            result = notification_service.notify_budget_near_limit(
                                user_id=budget.user_id,
                                budget_id=budget.id,
                                pool_id=state.pool_id,
                                category_name=category_name,
                                usage_percentage=float(state.usage_percentage),
                                spent_amount=float(state.spent_amount),
                                allocated_amount=float(state.allocated_amount)
                            )
                            if result:
                                notifications_sent += 1

            db.commit()
        except Exception as e:
            logger.exception("Error checking budget alerts: %s", str(e))
            db.rollback()

        return notifications_sent

    def _check_recurring_alerts(self, db) -> int:
        """Check for upcoming recurring expenses and send notifications."""
        from app.services.notification_service import NotificationService
        from app.models import RecurringExpense
        from app.enums import RecurringExpenseStatus

        notification_service = NotificationService(db)
        notifications_sent = 0

        try:
            # Look ahead 3 days for upcoming recurring expenses
            lookahead_date = date.today() + timedelta(days=3)
            
            recurring_expenses = (
                db.query(RecurringExpense)
                .filter(
                    RecurringExpense.status == RecurringExpenseStatus.ACTIVE,
                    RecurringExpense.next_due_on <= lookahead_date,
                    RecurringExpense.next_due_on >= date.today()
                )
                .all()
            )

            for recurring in recurring_expenses:
                days_until = (recurring.next_due_on - date.today()).days
                
                result = notification_service.notify_recurring_due_soon(
                    user_id=recurring.user_id,
                    recurring_id=recurring.id,
                    recurring_name=recurring.name,
                    days_until_due=days_until
                )
                if result:
                    notifications_sent += 1

            db.commit()
        except Exception as e:
            logger.exception("Error checking recurring alerts: %s", str(e))
            db.rollback()

        return notifications_sent

    def _check_settlement_alerts(self, db) -> int:
        """Check for pending settlements and send reminders."""
        from app.services.notification_service import NotificationService
        from app.models import Settlement, User
        from app.enums import SettlementStatus

        notification_service = NotificationService(db)
        notifications_sent = 0

        try:
            # Get pending settlements
            pending_settlements = (
                db.query(Settlement)
                .filter(Settlement.status == SettlementStatus.PENDING)
                .all()
            )

            for settlement in pending_settlements:
                # Check if notification was already sent recently (last 7 days)
                if notification_service.notification_recently_sent(
                    user_id=settlement.from_user_id,
                    notification_type=notification_service.create_notification.__self__.notification_repo.db.query(Settlement).first().type if hasattr(settlement, 'type') else None,
                    reference_id=settlement.id,
                    hours=168  # 7 days
                ):
                    continue

                # Get creditor name
                creditor = db.query(User).filter(User.id == settlement.to_user_id).first()
                creditor_name = creditor.username if creditor else f"User {settlement.to_user_id}"

                result = notification_service.notify_settlement_pending(
                    user_id=settlement.from_user_id,
                    settlement_id=settlement.id,
                    amount=float(settlement.amount),
                    creditor_name=creditor_name
                )
                if result:
                    notifications_sent += 1

            db.commit()
        except Exception as e:
            logger.exception("Error checking settlement alerts: %s", str(e))
            db.rollback()

        return notifications_sent

    def _check_goal_milestones(self, db) -> int:
        """Check savings goals for milestone achievements."""
        from app.services.notification_service import NotificationService
        from app.models import SavingsGoal
        from app.repositories.savings_goal_repository import SavingsGoalRepository

        notification_service = NotificationService(db)
        goal_repo = SavingsGoalRepository(db)
        notifications_sent = 0

        try:
            # Get active goals
            active_goals = goal_repo.list_goals_by_user(user_id=None, include_inactive=False)

            for goal in active_goals:
                if not goal.target_amount or goal.target_amount <= 0:
                    continue

                current_amount = Decimal(goal.current_amount or 0)
                target_amount = Decimal(goal.target_amount)
                progress_pct = float((current_amount / target_amount) * 100)

                # Check for completion (100%)
                if progress_pct >= 100:
                    # Check if completion notification already sent
                    from app.enums import NotificationType
                    if not notification_service.notification_recently_sent(
                        user_id=goal.user_id,
                        notification_type=NotificationType.GOAL_COMPLETED,
                        reference_id=goal.id,
                        hours=720  # 30 days
                    ):
                        result = notification_service.notify_goal_completed(
                            user_id=goal.user_id,
                            goal_id=goal.id,
                            goal_name=goal.name
                        )
                        if result:
                            notifications_sent += 1
                
                # Check milestones: 25%, 50%, 75%, 90%
                else:
                    milestones = [25, 50, 75, 90]
                    for milestone in milestones:
                        if progress_pct >= milestone:
                            # Create a unique check per milestone
                            from app.enums import NotificationType
                            recent_progress_notifications = notification_service.notification_repo.get_recent_by_type(
                                user_id=goal.user_id,
                                notification_type=NotificationType.GOAL_PROGRESS,
                                reference_id=goal.id,
                                hours=168  # 7 days
                            )
                            
                            # Check if we've already notified about this milestone level
                            milestone_already_notified = any(
                                f"{milestone}%" in (n.message or "") 
                                for n in recent_progress_notifications
                            )
                            
                            if not milestone_already_notified:
                                result = notification_service.notify_goal_progress(
                                    user_id=goal.user_id,
                                    goal_id=goal.id,
                                    goal_name=goal.name,
                                    progress_percentage=milestone
                                )
                                if result:
                                    notifications_sent += 1
                                # Only notify once per check cycle
                                break

            db.commit()
        except Exception as e:
            logger.exception("Error checking goal milestones: %s", str(e))
            db.rollback()

        return notifications_sent
