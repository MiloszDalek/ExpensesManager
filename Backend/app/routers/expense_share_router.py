from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.services import ExpenseShareService
from app.database import get_db
from app.schemas import ExpenseShareResponse, ExpenseShareCreate
from app.models import User
from app.utils.auth_dependencies import get_current_active_user

expense_share_router = APIRouter(
    prefix="/expense-shares",
    tags=["Expense Shares"],
)


def get_expense_share_service(db: Session = Depends(get_db)):
    return ExpenseShareService(db)
