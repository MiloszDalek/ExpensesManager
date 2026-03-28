from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import SettlementService
from app.models import User
from app.schemas import SettlementCreate, SettlementResponse
from app.utils.auth_dependencies import get_current_active_user


settlement_router = APIRouter(
    prefix="/settlements",
    tags=["Settlements"]
)

def get_settlement_service(db: Session = Depends(get_db)):
    return SettlementService(db)


@settlement_router.post("/group/cash", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
def create_settlement_within_group(
    settlement_in: SettlementCreate,
    service: SettlementService = Depends(get_settlement_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.create_group_settlement(settlement_in, current_user.id)


@settlement_router.post("/total/cash", response_model=list[SettlementResponse], status_code=status.HTTP_201_CREATED)
def create_total_settlement(
    settlement_in: SettlementCreate,
    service: SettlementService = Depends(get_settlement_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.create_total_settlement(settlement_in, current_user.id)


@settlement_router.get("/groups/{group_id}/all", response_model=list[SettlementResponse])
def get_settlements_from_group(
    group_id: int,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    service: SettlementService = Depends(get_settlement_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_settlements_by_group(group_id, limit, offset, current_user.id)


@settlement_router.get("/user/all", response_model=list[SettlementResponse])
def get_settlements_from_user(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    service: SettlementService = Depends(get_settlement_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_settlements_by_user(limit, offset, current_user.id)