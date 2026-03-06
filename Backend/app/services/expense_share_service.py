from sqlalchemy.orm import Session
from app.repositories import ExpenseShareRepository
from app.models import ExpenseShare
from app.schemas import ExpenseShareCreate


class ExpenseShareService:
    def __init__(self, db: Session):
        self.share_repo = ExpenseShareRepository(db)

