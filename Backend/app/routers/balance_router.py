from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.auth_dependencies import get_current_active_user
from app.services import BalanceService
from app.schemas import GroupBalances, UserBalanceItem, ContactBalanceByGroup
from app.models import User


balance_router = APIRouter(
    prefix="/balances",
    tags=["Balances"]
)

def get_balance_service(db: Session = Depends(get_db)):
    return BalanceService(db)


@balance_router.get("/group/{group_id}", response_model=GroupBalances)
def get_group_balance(
    group_id: int,
    service: BalanceService = Depends(get_balance_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_group_balances(group_id, current_user.id)


@balance_router.get("/contacts", response_model=list[UserBalanceItem])
def get_contacts_balance(
    service: BalanceService = Depends(get_balance_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_contacts_balances(current_user.id)


@balance_router.get("/contacts/{other_user_id}/groups", response_model=list[ContactBalanceByGroup])
def get_contact_balance_by_group(
    other_user_id: int,
    service: BalanceService = Depends(get_balance_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_contacts_balances_by_group(current_user.id, other_user_id)
