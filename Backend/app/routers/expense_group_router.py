from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.services import ExpenseGroupService
from app.database import get_db
from app.schemas import GroupExpenseCreate, GroupExpenseResponse, GroupExpenseUpdate
from app.models import User
from app.utils.auth_dependencies import get_current_active_user

expense_group_router = APIRouter(
    prefix="/expenses/group",
    tags=["Group Expenses"],
)

def get_expense_service(db: Session = Depends(get_db)):
    return ExpenseGroupService(db)


@expense_group_router.post("/{group_id}", response_model=GroupExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_group_expense(
    group_id: int,
    expense_in: GroupExpenseCreate,
    service: ExpenseGroupService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.create_group_expense(expense_in, group_id, current_user.id)


@expense_group_router.get("/{group_id}", response_model=list[GroupExpenseResponse])
def get_group_expenses(
    group_id: int,        
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    service: ExpenseGroupService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)  
):
    return service.get_group_expenses(group_id, limit, offset, current_user.id)


@expense_group_router.patch("/{group_id}/{expense_id}", response_model=GroupExpenseResponse)
def update_group_expense(
    group_id: int,
    expense_id: int,
    expense_in: GroupExpenseUpdate,
    service: ExpenseGroupService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)  
):
    return service.update_group_expense(expense_in, group_id, expense_id, current_user.id)


@expense_group_router.delete("/{group_id}/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group_expense(
    group_id: int,
    expense_id: int,
    service: ExpenseGroupService = Depends(get_expense_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.delete_group_expense(group_id, expense_id, current_user.id)