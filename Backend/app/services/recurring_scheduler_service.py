import asyncio
import logging
from datetime import date

from app.database import SessionLocal


logger = logging.getLogger(__name__)


class RecurringExpensesScheduler:
    def __init__(self, interval_seconds: int = 300):
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._stop_event: asyncio.Event | None = None

    async def start(self):
        if self._task and not self._task.done():
            return

        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run_loop(), name="recurring-expenses-scheduler")
        logger.info("Recurring scheduler started (interval=%ss)", self.interval_seconds)

    async def stop(self):
        if not self._task:
            return

        if self._stop_event is not None:
            self._stop_event.set()

        try:
            await self._task
        except Exception:
            logger.exception("Recurring scheduler stopped with an exception")
        finally:
            self._task = None
            self._stop_event = None

    async def _run_loop(self):
        while self._stop_event is not None and not self._stop_event.is_set():
            db = SessionLocal()
            try:
                from app.services.recurring_expense_service import RecurringExpenseService

                service = RecurringExpenseService(db)
                summary = service.generate_due_expenses(
                    user_id=None,
                    up_to_date=date.today(),
                    limit=500,
                )

                if summary["processed_series_count"] > 0:
                    logger.info(
                        "Recurring scheduler processed=%s generated=%s skipped=%s failed=%s",
                        summary["processed_series_count"],
                        summary["generated_count"],
                        summary["skipped_existing_count"],
                        summary["failed_series_count"],
                    )
            except Exception:
                logger.exception("Recurring scheduler iteration failed")
            finally:
                db.close()

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=self.interval_seconds)
            except asyncio.TimeoutError:
                continue