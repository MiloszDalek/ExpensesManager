from datetime import datetime
from typing import Literal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.enums import CurrencyEnum
from app.models import IncomeEntry


class IncomeRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, income_entry: IncomeEntry) -> IncomeEntry:
        self.db.add(income_entry)
        self.db.flush()
        return income_entry

    def get_by_id(self, income_id: int) -> IncomeEntry | None:
        return self.db.query(IncomeEntry).filter(IncomeEntry.id == income_id).first()

    def list_by_user_id(
        self,
        user_id: int,
        limit: int,
        offset: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        currency: CurrencyEnum | None = None,
        sort_by: Literal["income_date", "amount", "created_at"] = "income_date",
        sort_order: Literal["asc", "desc"] = "desc",
    ) -> list[IncomeEntry]:
        query = self.db.query(IncomeEntry).filter(IncomeEntry.user_id == user_id)

        if date_from is not None:
            query = query.filter(IncomeEntry.income_date >= date_from)

        if date_to is not None:
            query = query.filter(IncomeEntry.income_date <= date_to)

        if currency is not None:
            query = query.filter(IncomeEntry.currency == currency)

        sort_columns = {
            "income_date": IncomeEntry.income_date,
            "amount": IncomeEntry.amount,
            "created_at": IncomeEntry.created_at,
        }
        primary_column = sort_columns[sort_by]
        secondary_column = IncomeEntry.income_date if sort_by != "income_date" else IncomeEntry.created_at

        if sort_order == "asc":
            query = query.order_by(primary_column.asc(), secondary_column.asc(), IncomeEntry.id.asc())
        else:
            query = query.order_by(primary_column.desc(), secondary_column.desc(), IncomeEntry.id.desc())

        return query.limit(limit).offset(offset).all()

    def get_totals_by_currency(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ):
        query = self.db.query(
            IncomeEntry.currency.label("currency"),
            func.coalesce(func.sum(IncomeEntry.amount), 0).label("total_amount"),
        ).filter(IncomeEntry.user_id == user_id)

        if date_from is not None:
            query = query.filter(IncomeEntry.income_date >= date_from)

        if date_to is not None:
            query = query.filter(IncomeEntry.income_date <= date_to)

        return query.group_by(IncomeEntry.currency).all()

    def get_total_amount(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        currency: CurrencyEnum | None = None,
    ):
        query = self.db.query(func.coalesce(func.sum(IncomeEntry.amount), 0)).filter(IncomeEntry.user_id == user_id)

        if date_from is not None:
            query = query.filter(IncomeEntry.income_date >= date_from)

        if date_to is not None:
            query = query.filter(IncomeEntry.income_date <= date_to)

        if currency is not None:
            query = query.filter(IncomeEntry.currency == currency)

        return query.scalar() or 0

    def delete(self, income_entry: IncomeEntry):
        self.db.delete(income_entry)
        self.db.flush()

    def save_all(self):
        self.db.commit()
