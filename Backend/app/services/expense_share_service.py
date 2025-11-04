from sqlalchemy.orm import Session
from app.repositories import ExpenseShareRepository
from app.models import ExpenseShare
from app.schemas import ExpenseShareCreate


class ExpenseShareService:
    def __init__(self, db: Session):
        self.share_repo = ExpenseShareRepository(db)


    def get_shares_for_expense(self, expense_id: int) -> list[ExpenseShare]:
        return self.share_repo.get_by_expense(expense_id)


    def get_user_shares(self, user_id: int) -> list[ExpenseShare]:
        return self.share_repo.get_by_user(user_id)
    

    def create_many_shares(self, shares_data: list[ExpenseShareCreate]) -> list[ExpenseShare]:
        return self.share_repo.create_many(shares_data)
    

    def delete_shares_by_expense(self, expense_id: int) -> int:
        return self.share_repo.delete_by_expense(expense_id)