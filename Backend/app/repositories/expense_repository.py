from datetime import datetime
from typing import Literal

from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import func, case, literal
from app.models import Category, Expense, ExpenseShare, Group
from app.enums import CurrencyEnum


class ExpenseRepository:
    def __init__(self, db: Session):
        self.db = db


    def create(self, expense: Expense) -> Expense:
        self.db.add(expense)
        self.db.flush()
        return expense


    def _apply_personal_expense_filters(
        self,
        query,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
    ):
        query = query.filter(Expense.user_id == user_id, Expense.group_id.is_(None))

        if date_from:
            query = query.filter(Expense.expense_date >= date_from)

        if date_to:
            query = query.filter(Expense.expense_date <= date_to)

        if category_ids:
            query = query.filter(Expense.category_id.in_(category_ids))

        if currency is not None:
            query = query.filter(Expense.currency == currency)

        return query


    def _apply_group_share_filters(
        self,
        query,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        group_id: int | None = None,
    ):
        query = query.join(ExpenseShare, ExpenseShare.expense_id == Expense.id).filter(
            Expense.group_id.isnot(None),
            ExpenseShare.user_id == user_id,
        )

        if group_id is not None:
            query = query.filter(Expense.group_id == group_id)

        if date_from:
            query = query.filter(Expense.expense_date >= date_from)

        if date_to:
            query = query.filter(Expense.expense_date <= date_to)

        if category_ids:
            query = query.filter(Expense.category_id.in_(category_ids))

        if currency is not None:
            query = query.filter(Expense.currency == currency)

        return query


    def get_personal_by_user_id(
        self,
        user_id: int,
        limit: int,
        offset: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        sort_by: Literal["expense_date", "amount", "created_at"] = "expense_date",
        sort_order: Literal["asc", "desc"] = "desc",
    ) -> list[Expense]:
        query = self._apply_personal_expense_filters(
            query=self.db.query(Expense),
            user_id=user_id,
            date_from=date_from,
            date_to=date_to,
            category_ids=category_ids,
            currency=currency,
        )

        sort_columns = {
            "expense_date": Expense.expense_date,
            "amount": Expense.amount,
            "created_at": Expense.created_at,
        }
        primary_sort_column = sort_columns[sort_by]
        secondary_sort_column = Expense.expense_date if sort_by != "expense_date" else Expense.created_at

        if sort_order == "asc":
            query = query.order_by(
                primary_sort_column.asc(),
                secondary_sort_column.asc(),
                Expense.id.asc(),
            )
        else:
            query = query.order_by(
                primary_sort_column.desc(),
                secondary_sort_column.desc(),
                Expense.id.desc(),
            )

        return query.limit(limit).offset(offset).all()


    def get_personal_summary(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        top_categories_limit: int = 5,
    ):
        total_count = (
            self._apply_personal_expense_filters(
                query=self.db.query(func.count(Expense.id)),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
            )
            .scalar()
            or 0
        )

        totals_by_currency = (
            self._apply_personal_expense_filters(
                query=self.db.query(
                    Expense.currency.label("currency"),
                    func.coalesce(func.sum(Expense.amount), 0).label("total_amount"),
                ),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
            )
            .group_by(Expense.currency)
            .all()
        )

        top_categories = (
            self._apply_personal_expense_filters(
                query=self.db.query(
                    Expense.category_id.label("category_id"),
                    Category.name.label("category_name"),
                    func.coalesce(func.sum(Expense.amount), 0).label("total_amount"),
                ).join(Category, Category.id == Expense.category_id),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
            )
            .group_by(Expense.category_id, Category.name)
            .order_by(func.sum(Expense.amount).desc())
            .limit(top_categories_limit)
            .all()
        )

        return {
            "total_count": total_count,
            "totals_by_currency": totals_by_currency,
            "top_categories": top_categories,
        }


    def get_personal_total_count(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
    ) -> int:
        return (
            self._apply_personal_expense_filters(
                query=self.db.query(func.count(Expense.id)),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
            ).scalar()
            or 0
        )


    def get_group_share_total_count(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        group_id: int | None = None,
    ) -> int:
        return (
            self._apply_group_share_filters(
                query=self.db.query(func.count(Expense.id)).select_from(Expense),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
                group_id=group_id,
            ).scalar()
            or 0
        )


    def get_personal_totals_by_currency(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
    ):
        return (
            self._apply_personal_expense_filters(
                query=self.db.query(
                    Expense.currency.label("currency"),
                    func.coalesce(func.sum(Expense.amount), 0).label("total_amount"),
                ),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
            )
            .group_by(Expense.currency)
            .all()
        )


    def get_group_share_totals_by_currency(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        group_id: int | None = None,
    ):
        return (
            self._apply_group_share_filters(
                query=self.db.query(
                    Expense.currency.label("currency"),
                    func.coalesce(func.sum(ExpenseShare.share_amount), 0).label("total_amount"),
                ).select_from(Expense),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
                group_id=group_id,
            )
            .group_by(Expense.currency)
            .all()
        )


    def get_personal_top_categories(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
    ):
        return (
            self._apply_personal_expense_filters(
                query=self.db.query(
                    Expense.category_id.label("category_id"),
                    Category.name.label("category_name"),
                    func.coalesce(func.sum(Expense.amount), 0).label("total_amount"),
                )
                .select_from(Expense)
                .join(Category, Category.id == Expense.category_id),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
            )
            .group_by(Expense.category_id, Category.name)
            .all()
        )


    def get_group_share_top_categories(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        group_id: int | None = None,
    ):
        return (
            self._apply_group_share_filters(
                query=self.db.query(
                    Expense.category_id.label("category_id"),
                    Category.name.label("category_name"),
                    func.coalesce(func.sum(ExpenseShare.share_amount), 0).label("total_amount"),
                ).select_from(Expense),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
                group_id=group_id,
            )
            .join(Category, Category.id == Expense.category_id)
            .group_by(Expense.category_id, Category.name)
            .all()
        )


    def get_group_share_top_groups(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        group_id: int | None = None,
    ):
        return (
            self._apply_group_share_filters(
                query=self.db.query(
                    Group.id.label("group_id"),
                    Group.name.label("group_name"),
                    func.coalesce(func.sum(ExpenseShare.share_amount), 0).label("total_amount"),
                ).select_from(Expense),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
                group_id=group_id,
            )
            .join(Group, Group.id == Expense.group_id)
            .group_by(Group.id, Group.name)
            .all()
        )


    def get_personal_daily_trends(
        self,
        user_id: int,
        date_from: datetime,
        date_to: datetime,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
    ):
        day_label = func.date(Expense.expense_date).label("day")
        return (
            self._apply_personal_expense_filters(
                query=self.db.query(
                    day_label,
                    Expense.currency.label("currency"),
                    func.coalesce(func.sum(Expense.amount), 0).label("total_amount"),
                ),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
            )
            .group_by(day_label, Expense.currency)
            .order_by(day_label.asc(), Expense.currency.asc())
            .all()
        )


    def get_group_share_daily_trends(
        self,
        user_id: int,
        date_from: datetime,
        date_to: datetime,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        group_id: int | None = None,
    ):
        day_label = func.date(Expense.expense_date).label("day")
        return (
            self._apply_group_share_filters(
                query=self.db.query(
                    day_label,
                    Expense.currency.label("currency"),
                    func.coalesce(func.sum(ExpenseShare.share_amount), 0).label("total_amount"),
                ).select_from(Expense),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
                group_id=group_id,
            )
            .group_by(day_label, Expense.currency)
            .order_by(day_label.asc(), Expense.currency.asc())
            .all()
        )


    def get_personal_summary_records(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
    ):
        return (
            self._apply_personal_expense_filters(
                query=self.db.query(
                    Expense.id.label("expense_id"),
                    literal("personal").label("scope"),
                    Expense.title.label("title"),
                    Expense.expense_date.label("expense_date"),
                    Expense.created_at.label("created_at"),
                    Expense.currency.label("currency"),
                    Expense.category_id.label("category_id"),
                    Category.name.label("category_name"),
                    Expense.group_id.label("group_id"),
                    literal(None).label("group_name"),
                    Expense.amount.label("total_amount"),
                    Expense.amount.label("user_amount"),
                    Expense.recurring_expense_id.label("recurring_expense_id"),
                    Expense.recurring_occurrence_date.label("recurring_occurrence_date"),
                )
                .select_from(Expense)
                .join(Category, Category.id == Expense.category_id),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
            )
            .all()
        )


    def get_group_share_summary_records(
        self,
        user_id: int,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        category_ids: list[int] | None = None,
        currency: CurrencyEnum | None = None,
        group_id: int | None = None,
    ):
        return (
            self._apply_group_share_filters(
                query=self.db.query(
                    Expense.id.label("expense_id"),
                    literal("group").label("scope"),
                    Expense.title.label("title"),
                    Expense.expense_date.label("expense_date"),
                    Expense.created_at.label("created_at"),
                    Expense.currency.label("currency"),
                    Expense.category_id.label("category_id"),
                    Category.name.label("category_name"),
                    Group.id.label("group_id"),
                    Group.name.label("group_name"),
                    Expense.amount.label("total_amount"),
                    ExpenseShare.share_amount.label("user_amount"),
                    Expense.recurring_expense_id.label("recurring_expense_id"),
                    Expense.recurring_occurrence_date.label("recurring_occurrence_date"),
                ).select_from(Expense),
                user_id=user_id,
                date_from=date_from,
                date_to=date_to,
                category_ids=category_ids,
                currency=currency,
                group_id=group_id,
            )
            .join(Category, Category.id == Expense.category_id)
            .join(Group, Group.id == Expense.group_id)
            .all()
        )
    

    def get_all_group_by_group_id(self, group_id: int, limit: int, offset: int):
        return (
            self.db.query(Expense)
            .options(selectinload(Expense.shares))
            .filter(Expense.group_id == group_id)
            .order_by(Expense.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
    

    def get_expenses_with_shares(self, group_id: int): # pierwsza próba implementacji, ale niezbyt wydajna
        return (
            self.db.query(Expense)
            .options(joinedload(Expense.shares))
            .filter(Expense.group_id == group_id)
            .all()
        )
        

    def get_paid_to_others(self, group_id: int, current_user_id: int):
        return (
            self.db.query(
                ExpenseShare.user_id.label("other_user_id"),
                func.coalesce(func.sum(ExpenseShare.share_amount), 0).label("amount")
            )
            .join(Expense, Expense.id == ExpenseShare.expense_id)
            .filter(
                Expense.group_id == group_id,
                Expense.user_id == current_user_id,
                ExpenseShare.user_id != current_user_id
            )
            .group_by(ExpenseShare.user_id)
            .all()
        )


    def get_owed_by_others(self, group_id: int, current_user_id: int):
        return (
            self.db.query(
                Expense.user_id.label("other_user_id"),
                func.coalesce(func.sum(ExpenseShare.share_amount), 0).label("amount")
            )
            .join(Expense, Expense.id == ExpenseShare.expense_id)
            .filter(
                Expense.group_id == group_id,
                ExpenseShare.user_id == current_user_id,
                Expense.user_id != current_user_id
            )
            .group_by(Expense.user_id)
            .all()
        )


    def get_balances_with_users(self, current_user_id: int):
        other_user_id_expr = case(
            (Expense.user_id == current_user_id, ExpenseShare.user_id),
            else_=Expense.user_id,
        ).label("other_user_id")

        balance_expr = func.sum(
            case(
                (Expense.user_id == current_user_id, ExpenseShare.share_amount),
                else_=-ExpenseShare.share_amount,
            )
        ).label("balance")

        return (
            self.db.query(other_user_id_expr, balance_expr)
            .select_from(Expense)
            .join(ExpenseShare, ExpenseShare.expense_id == Expense.id)
            .filter(
                Expense.group_id.isnot(None),
                (Expense.user_id == current_user_id)
                | (ExpenseShare.user_id == current_user_id)
            )
            .group_by(other_user_id_expr)
            .all()
        )


    def get_balance_with_user_by_group(self, current_user_id: int, other_user_id: int):
        balance_expr = func.sum(
            case(
                (Expense.user_id == current_user_id, ExpenseShare.share_amount),
                else_=-ExpenseShare.share_amount,
            )
        ).label("balance")

        return (
            self.db.query(Expense.group_id, balance_expr)
            .select_from(Expense)
            .join(ExpenseShare, ExpenseShare.expense_id == Expense.id)
            .filter(
                (Expense.user_id == current_user_id) & (ExpenseShare.user_id == other_user_id)
                | (Expense.user_id == other_user_id) & (ExpenseShare.user_id == current_user_id)
            )
            .group_by(Expense.group_id)
            .all()
        )


    def get_by_id(self, expense_id: int) -> Expense | None:
        return self.db.query(Expense).filter(Expense.id == expense_id).first()


    def update(self, expense: Expense, update_data: dict) -> Expense:
        for field, value in update_data.items():
            setattr(expense, field, value)

        self.db.flush()
        return expense


    def delete(self, expense: Expense):
        self.db.delete(expense)
        self.db.flush()


    def save_all(self):
        self.db.commit()