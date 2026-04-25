from sqlalchemy.orm import Session
from app.repositories import ExpenseRepository, ExpenseShareRepository, SettlementRepository, GroupRepository
from app.models import Group


class DashboardService:
    def __init__(self, db: Session):
        pass