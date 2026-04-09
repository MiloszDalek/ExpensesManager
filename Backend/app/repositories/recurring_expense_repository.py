from datetime import date
from typing import Literal

from sqlalchemy.orm import Session, selectinload

from app.enums import RecurringExpenseStatus
from app.models import Expense, RecurringExpense


RecurringScope = Literal["all", "personal", "group"]


class RecurringExpenseRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, recurring_expense: RecurringExpense) -> RecurringExpense:
        self.db.add(recurring_expense)
        self.db.flush()
        return recurring_expense

    def get_by_id(self, recurring_expense_id: int) -> RecurringExpense | None:
        return (
            self.db.query(RecurringExpense)
            .options(selectinload(RecurringExpense.participants))
            .filter(RecurringExpense.id == recurring_expense_id)
            .first()
        )

    def list_by_user(
        self,
        user_id: int,
        scope: RecurringScope,
        group_id: int | None,
        status: RecurringExpenseStatus | None,
        limit: int,
        offset: int,
    ) -> list[RecurringExpense]:
        query = (
            self.db.query(RecurringExpense)
            .options(selectinload(RecurringExpense.participants))
            .filter(RecurringExpense.user_id == user_id)
        )

        if scope == "personal":
            query = query.filter(RecurringExpense.group_id.is_(None))
        elif scope == "group":
            query = query.filter(RecurringExpense.group_id.isnot(None))

        if group_id is not None:
            query = query.filter(RecurringExpense.group_id == group_id)

        if status is not None:
            query = query.filter(RecurringExpense.status == status)

        return (
            query.order_by(RecurringExpense.created_at.desc(), RecurringExpense.id.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    def get_due_series(
        self,
        due_on: date,
        limit: int,
        user_id: int | None = None,
    ) -> list[RecurringExpense]:
        query = (
            self.db.query(RecurringExpense)
            .options(selectinload(RecurringExpense.participants))
            .filter(
                RecurringExpense.status == RecurringExpenseStatus.ACTIVE,
                RecurringExpense.next_due_on <= due_on,
            )
        )

        if user_id is not None:
            query = query.filter(RecurringExpense.user_id == user_id)

        return query.order_by(RecurringExpense.next_due_on.asc(), RecurringExpense.id.asc()).limit(limit).all()

    def occurrence_exists(self, recurring_expense_id: int, occurrence_date: date) -> bool:
        return (
            self.db.query(Expense.id)
            .filter(
                Expense.recurring_expense_id == recurring_expense_id,
                Expense.recurring_occurrence_date == occurrence_date,
            )
            .first()
            is not None
        )

    def delete(self, recurring_expense: RecurringExpense):
        self.db.delete(recurring_expense)

    def save_all(self):
        self.db.commit()

    def refresh(self, recurring_expense: RecurringExpense):
        self.db.refresh(recurring_expense)