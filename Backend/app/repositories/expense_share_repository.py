from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import ExpenseShare, Expense


class ExpenseShareRepository:
    def __init__(self, db: Session):
        self.db = db


    def create_many(self, shares: list[ExpenseShare]) -> list[ExpenseShare]:
        self.db.add_all(shares)
        self.db.commit()
        for s in shares:
            self.db.refresh(s)
        return shares


    def get_by_expense(self, expense_id: int) -> list[ExpenseShare]:
        return self.db.query(ExpenseShare).filter(ExpenseShare.expense_id == expense_id).all()


    def get_by_user(self, user_id: int) -> list[ExpenseShare]:
        return self.db.query(ExpenseShare).filter(ExpenseShare.user_id == user_id).all()


    def delete_by_expense(self, expense_id: int):
        self.db.query(ExpenseShare).filter(ExpenseShare.expense_id == expense_id).delete()
        self.db.commit()


    # 1. Ile ja komuś wiszę
    def sum_user_owed(self, user_id: int) -> float:
        """
        Suma: ile user powinien innym (z perspektywy konsumenta).
        """
        result = (
            self.db.query(func.coalesce(func.sum(ExpenseShare.share_amount), 0))
            .join(Expense, Expense.id == ExpenseShare.expense_id)
            .filter(
                ExpenseShare.user_id == user_id,        # ja jestem konsumentem
                Expense.payer_id != user_id           # ale nie płaciłem
            )
            .scalar()
        )
        return float(result)


    # 2. Ile ktoś powinien userowi
    def sum_user_is_owed(self, user_id: int) -> float:
        """
        Suma: ile inni powinni userowi (z perspektywy płacącego).
        """
        result = (
            self.db.query(func.coalesce(func.sum(ExpenseShare.share_amount), 0))
            .join(Expense, Expense.id == ExpenseShare.expense_id)
            .filter(
                Expense.payer_id == user_id,          # ja płaciłem
                ExpenseShare.user_id != user_id         # ktoś inny konsumował
            )
            .scalar()
        )
        return float(result)


    # 3. Lista surowych bilansów (per pair)
    def list_user_balances(self, user_id: int):
        """
        Zwraca listę "kto komu ile" bez odejmowania settlementów.
        """
        rows = (
            self.db.query(
                ExpenseShare.user_id.label("from_user"),
                Expense.payer_id.label("to_user"),
                func.sum(ExpenseShare.share_amount).label("amount")
            )
            .join(Expense, Expense.id == ExpenseShare.expense_id)
            .filter(
                (ExpenseShare.user_id == user_id) |  # user konsumował
                (Expense.payer_id == user_id)      # user płacił
            )
            .group_by("from_user", "to_user")
            .all()
        )
        return rows