from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.services import ExpenseShareService, get_current_active_user
from app.database import get_db
from app.schemas import ExpenseShareResponse, ExpenseShareCreate
from app.models import User

expense_share_router = APIRouter(
    prefix="/expense-shares",
    tags=["Expense Shares"],
)


def get_expense_share_service(db: Session = Depends(get_db)):
    return ExpenseShareService(db)


@expense_share_router.get("/expense/{expense_id}", response_model=list[ExpenseShareResponse])
def get_shares_for_expense(
    expense_id: int,
    service: ExpenseShareService = Depends(get_expense_share_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_shares_for_expense(expense_id)


@expense_share_router.get("/user/{user_id}", response_model=list[ExpenseShareResponse])
def get_user_shares(
    user_id: int,
    service: ExpenseShareService = Depends(get_expense_share_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_user_shares(user_id)


@expense_share_router.post("/bulk", response_model=list[ExpenseShareResponse], status_code=status.HTTP_201_CREATED)
def create_many_shares(
    shares_data: list[ExpenseShareCreate],
    service: ExpenseShareService = Depends(get_expense_share_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.create_many_shares(shares_data)


@expense_share_router.delete("/expense/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shares_by_expense(
    expense_id: int,
    service: ExpenseShareService = Depends(get_expense_share_service),
    current_user: User = Depends(get_current_active_user)
):
    service.delete_shares_by_expense(expense_id)
