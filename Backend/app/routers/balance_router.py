from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.auth_dependencies import get_current_active_user
from app.services import BalanceService
from app.models import User


balance_router = APIRouter(
    prefix="/groups",
    tags=["Balances"]
)

def get_balance_service(db: Session = Depends(get_db)):
    return BalanceService(db)


@balance_router.get("/{group_id}/balance")
def get_group_balance(
    group_id: int,
    service: BalanceService = Depends(get_balance_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_group_balance(group_id, current_user.id)