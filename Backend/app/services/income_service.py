from datetime import date, datetime, time
from typing import Literal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.enums import CurrencyEnum
from app.models import IncomeEntry
from app.repositories import IncomeRepository
from app.schemas import IncomeEntryCreate


class IncomeService:
    def __init__(self, db: Session):
        self.income_repo = IncomeRepository(db)

    def create_income_entry(self, income_in: IncomeEntryCreate, user_id: int) -> IncomeEntry:
        if income_in.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")

        try:
            income_entry = IncomeEntry(
                user_id=user_id,
                title=income_in.title,
                source=income_in.source,
                amount=income_in.amount,
                currency=income_in.currency,
                income_date=income_in.income_date,
                notes=income_in.notes,
            )
            income_entry = self.income_repo.create(income_entry)
            self.income_repo.save_all()
            return income_entry
        except Exception:
            self.income_repo.db.rollback()
            raise

    def list_income_entries(
        self,
        user_id: int,
        limit: int,
        offset: int,
        date_from: date | None = None,
        date_to: date | None = None,
        currency: CurrencyEnum | None = None,
        sort_by: Literal["income_date", "amount", "created_at"] = "income_date",
        sort_order: Literal["asc", "desc"] = "desc",
    ) -> list[IncomeEntry]:
        if date_from and date_to and date_from > date_to:
            raise HTTPException(status_code=400, detail="date_from cannot be greater than date_to")

        date_from_dt = datetime.combine(date_from, time.min) if date_from else None
        date_to_dt = datetime.combine(date_to, time.max) if date_to else None

        return self.income_repo.list_by_user_id(
            user_id=user_id,
            limit=limit,
            offset=offset,
            date_from=date_from_dt,
            date_to=date_to_dt,
            currency=currency,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_income_summary(
        self,
        user_id: int,
        date_from: date | None = None,
        date_to: date | None = None,
    ):
        if date_from and date_to and date_from > date_to:
            raise HTTPException(status_code=400, detail="date_from cannot be greater than date_to")

        date_from_dt = datetime.combine(date_from, time.min) if date_from else None
        date_to_dt = datetime.combine(date_to, time.max) if date_to else None

        return {
            "totals_by_currency": self.income_repo.get_totals_by_currency(
                user_id=user_id,
                date_from=date_from_dt,
                date_to=date_to_dt,
            )
        }

    def delete_income_entry(self, income_id: int, user_id: int):
        income_entry = self.income_repo.get_by_id(income_id)
        if not income_entry:
            raise HTTPException(status_code=404, detail="Income entry not found")

        if income_entry.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        self.income_repo.delete(income_entry)
        self.income_repo.save_all()
