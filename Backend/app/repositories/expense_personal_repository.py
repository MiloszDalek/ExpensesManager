from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import Expense


class ExpensePersonalRepository:
    def __init__(self, db: Session):
        self.db = db


    def create(self, expense: Expense) -> Expense:
        self.db.add(expense)
        self.db.commit()
        self.db.refresh(expense)
        return expense


    def get_all_by_user_id(self, user_id: int) -> list[Expense]:
        return self.db.query(Expense).filter(Expense.user_id == user_id, Expense.group_id.is_(None)).all()
    

    def get_by_id(self, expense_id: int) -> Expense | None:
        return self.db.query(Expense).filter(Expense.id == expense_id).first()


    def update(self, expense: Expense, update_data: dict) -> Expense:
        for field, value in update_data.items():
            setattr(expense, field, value)

        self.db.commit()
        self.db.refresh(expense)
        return expense


    def delete(self, expense: Expense):
        self.db.delete(expense)
        self.db.commit()



  # -- inne reliktowe pozostałości vibecodingu narazie bez zastosowania


    # def sum_personal_expenses(self, user_id: int) -> float:
    #     result = (
    #         self.db.query(Expense)
    #         .filter(
    #             Expense.is_personal == True,
    #             Expense.payer_id == user_id
    #         )
    #         .with_entities(func.coalesce(func.sum(Expense.amount), 0))
    #         .scalar()
    #     )
    #     return float(result)
    

    # def get_recent_expenses(self, user_id: int, limit: int = 5):
    #     return (
    #         self.db.query(Expense)
    #         .filter(Expense.payer_id == user_id)
    #         .order_by(Expense.created_at.desc())
    #         .limit(limit)
    #         .all()
    #     )
