from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.dashboard_service import DashboardService
from Backend.app.utils.auth_dependencies import get_current_active_user


dashboard_router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


def get_dashboard_service(db: Session = Depends(get_db)):
    return DashboardService(db)


@dashboard_router.get("/total-owed")
def total_owed(
    service: DashboardService = Depends(get_dashboard_service),
    current_user = Depends(get_current_active_user)
):
    return {"total_owed": service.get_total_owed(current_user.id)}


@dashboard_router.get("/total-receivable")
def total_receivable(
    service: DashboardService = Depends(get_dashboard_service),
    current_user = Depends(get_current_active_user)
):
    return {"total_receivable": service.get_total_receivable(current_user.id)}


@dashboard_router.get("/personal-spending")
def personal_spending(
    service: DashboardService = Depends(get_dashboard_service),
    current_user = Depends(get_current_active_user)
):
    return {"personal_spending": service.get_personal_spending(current_user.id)}


@dashboard_router.get("/group-balances")
def group_balances(
    service: DashboardService = Depends(get_dashboard_service),
    current_user = Depends(get_current_active_user)
):
    return {"group_balances": service.get_group_balances(current_user.id)}