from sqlalchemy.orm import Session
from app.repositories import ExpenseRepository, ExpenseShareRepository
from app.services import ExpenseGroupService, GroupService


class BalanceService:
    def __init__(self, db: Session):
        self.expense_service = ExpenseGroupService(db)
        self.group_service = GroupService(db)
        self.expense_repo = ExpenseRepository(db)
        self.share_repo = ExpenseShareRepository(db)


    