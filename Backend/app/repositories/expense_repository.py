from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import func
from app.models import Expense, ExpenseShare


class ExpenseRepository:
    def __init__(self, db: Session):
        self.db = db


    def create(self, expense: Expense) -> Expense:
        self.db.add(expense)
        self.db.flush()
        return expense


    def get_all_personal_by_user_id(self, user_id: int) -> list[Expense]:
        return self.db.query(Expense).filter(Expense.user_id == user_id, Expense.group_id.is_(None)).all()
    

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