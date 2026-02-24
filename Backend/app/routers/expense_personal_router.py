from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.services import ExpenseService
from app.database import get_db
from app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.models import User
from app.utils.auth_dependencies import get_current_active_user

expense_personal_router = APIRouter(
    prefix="/expenses/personal",
    tags=["Personal Expenses"],
)

def get_expense_service(db: Session = Depends(get_db)):
    return ExpenseService(db)


@expense_personal_router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_personal_expense(
    expense_in: ExpenseCreate,
    service: ExpenseService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.create_personal_expense(expense_in, current_user.id)


@expense_personal_router.get("/all", response_model=list[ExpenseResponse]) # only for debuging
def get_all_personal_expenses(
    service: ExpenseService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_all_personal_expenses(current_user.id)