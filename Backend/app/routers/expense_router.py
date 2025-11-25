from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.services import ExpenseService
from app.database import get_db
from app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.models import User
from Backend.app.utils.auth_dependencies import get_current_active_user

expense_router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"],
)


def get_expense_service(db: Session = Depends(get_db)):
    return ExpenseService(db)


@expense_router.get("/group/{group_id}", response_model=list[ExpenseResponse])
def list_group_expenses(
    group_id: int,
    service: ExpenseService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.list_group_expenses(group_id)


@expense_router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    service: ExpenseService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_expense(expense_id)


@expense_router.post("/group/{group_id}", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    group_id: int,
    expense_data: ExpenseCreate,
    service: ExpenseService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.create_expense(expense_data, group_id, current_user.id)


@expense_router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    service: ExpenseService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    update_dict = expense_data.model_dump(exclude_unset=True)
    return service.update_expense(expense_id, update_dict)


@expense_router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    service: ExpenseService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user),
):
    service.delete_expense(expense_id)
    return None
