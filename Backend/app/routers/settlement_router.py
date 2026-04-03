from fastapi import APIRouter, Depends, status, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import SettlementService
from app.models import User
from app.schemas import (
    SettlementCreate,
    SettlementResponse,
    PayPalSettlementInitiateCreate,
    PayPalSettlementInitiateResponse,
    PayPalTotalSettlementInitiateCreate,
    PayPalTotalSettlementInitiateResponse,
    PayPalSettlementFinalizeRequest,
)
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


@settlement_router.post("/group/paypal/initiate", response_model=PayPalSettlementInitiateResponse, status_code=status.HTTP_201_CREATED)
def initiate_group_paypal_settlement(
    settlement_in: PayPalSettlementInitiateCreate,
    service: SettlementService = Depends(get_settlement_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.initiate_group_paypal_settlement(settlement_in, current_user.id)


@settlement_router.post("/total/paypal/initiate", response_model=PayPalTotalSettlementInitiateResponse, status_code=status.HTTP_201_CREATED)
def initiate_total_paypal_settlement(
    settlement_in: PayPalTotalSettlementInitiateCreate,
    service: SettlementService = Depends(get_settlement_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.initiate_total_paypal_settlement(settlement_in, current_user.id)


@settlement_router.post("/paypal/finalize", response_model=SettlementResponse)
def finalize_paypal_settlement(
    payload: PayPalSettlementFinalizeRequest,
    service: SettlementService = Depends(get_settlement_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.finalize_paypal_settlement(payload.order_id, current_user.id)


@settlement_router.post("/paypal/webhook")
async def paypal_webhook(
    request: Request,
    service: SettlementService = Depends(get_settlement_service),
):
    event = await request.json()
    headers = {
        "paypal-auth-algo": request.headers.get("paypal-auth-algo"),
        "paypal-cert-url": request.headers.get("paypal-cert-url"),
        "paypal-transmission-id": request.headers.get("paypal-transmission-id"),
        "paypal-transmission-sig": request.headers.get("paypal-transmission-sig"),
        "paypal-transmission-time": request.headers.get("paypal-transmission-time"),
    }
    return service.handle_paypal_webhook(headers, event)


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