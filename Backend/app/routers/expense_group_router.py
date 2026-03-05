from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.services import ExpensePersonalService
from app.database import get_db
from app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.models import User
from app.utils.auth_dependencies import get_current_active_user

expense_group_router = APIRouter(
    prefix="/expenses/group",
    tags=["Group Expenses"],
)

def get_expense_service(db: Session = Depends(get_db)):
    return ExpensePersonalService(db)
