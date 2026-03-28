from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.services import ExpensePersonalService
from app.database import get_db
from app.schemas import PersonalExpenseCreate, PersonalExpenseUpdate, PersonalExpenseResponse
from app.models import User
from app.utils.auth_dependencies import get_current_active_user

expense_personal_router = APIRouter(
    prefix="/expenses/personal",
    tags=["Personal Expenses"],
)

def get_expense_service(db: Session = Depends(get_db)):
    return ExpensePersonalService(db)


@expense_personal_router.post("/", response_model=PersonalExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_personal_expense(
    expense_in: PersonalExpenseCreate,
    service: ExpensePersonalService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.create_personal_expense(expense_in, current_user.id)


@expense_personal_router.get("/", response_model=list[PersonalExpenseResponse], status_code=status.HTTP_200_OK)
def get_personal_expenses(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    service: ExpensePersonalService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_personal_expenses(current_user.id, limit, offset)


@expense_personal_router.patch("/{expense_id}", response_model=PersonalExpenseResponse, status_code=status.HTTP_200_OK)
def edit_personal_expense(
    expense_id: int,
    expense_in: PersonalExpenseUpdate,
    service: ExpensePersonalService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.edit_personal_expense(expense_id, expense_in, current_user.id)


@expense_personal_router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_personal_expense(
    expense_id: int,
    service: ExpensePersonalService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    service.delete_personal_expense(expense_id, current_user.id)
