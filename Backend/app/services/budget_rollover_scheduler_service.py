import asyncio
import logging
from datetime import date

from app.database import SessionLocal


logger = logging.getLogger(__name__)


class BudgetRolloverScheduler:
    def __init__(self, interval_seconds: int = 3600):
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._stop_event: asyncio.Event | None = None

    async def start(self):
        if self._task and not self._task.done():
            return

        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run_loop(), name="budget-rollover-scheduler")
        logger.info("Budget rollover scheduler started (interval=%ss)", self.interval_seconds)

    async def stop(self):
        if not self._task:
            return

        if self._stop_event is not None:
            self._stop_event.set()

        try:
            await self._task
        except Exception:
            logger.exception("Budget rollover scheduler stopped with an exception")
        finally:
            self._task = None
            self._stop_event = None

    async def _run_loop(self):
        while self._stop_event is not None and not self._stop_event.is_set():
            db = SessionLocal()
            try:
                from app.services.budget_service import BudgetService

                service = BudgetService(db)
                summary = service.run_due_rollovers(as_of_date=date.today())

                if summary["processed_budgets_count"] > 0:
                    logger.info(
                        "Budget rollover scheduler processed=%s created=%s",
                        summary["processed_budgets_count"],
                        summary["created_budgets_count"],
                    )
            except Exception:
                logger.exception("Budget rollover scheduler iteration failed")
            finally:
                db.close()

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=self.interval_seconds)
            except asyncio.TimeoutError:
                continue
