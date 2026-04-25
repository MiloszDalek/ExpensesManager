from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.database import SessionLocal
from app.routers import ( 
        auth_router,
        user_router, 
        group_router, 
        expense_group_router, 
        expense_personal_router,
        expense_summary_router,
        dashboard_router, 
        category_router, 
        invitation_router,
        notification_router,
        contact_router,
        balance_router,
        settlement_router,
        receipt_router,
        recurring_expense_router,
        income_router,
        budget_router,
        savings_goal_router,
    )
from app.services import AuthService, BudgetRolloverScheduler, RecurringExpensesScheduler, NotificationScheduler
from app.utils import seed_default_categories, reset_database
from app import models
import logging


logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:     %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)

# reset_database()

settings = get_settings()
recurring_scheduler = RecurringExpensesScheduler(interval_seconds=300)
budget_rollover_scheduler = BudgetRolloverScheduler(interval_seconds=settings.BUDGET_ROLLOVER_SCHEDULER_INTERVAL_SECONDS)
notification_scheduler = NotificationScheduler(interval_seconds=3600)  # Check every hour

allowed_origins = [
    origin.strip().rstrip("/")
    for origin in settings.FRONTEND_URL.split(",")
    if origin.strip()
]

app = FastAPI(title="Expenses Manager API", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix='/api')
app.include_router(user_router, prefix='/api')
app.include_router(group_router, prefix='/api')
app.include_router(expense_group_router, prefix='/api')
app.include_router(expense_personal_router, prefix='/api')
app.include_router(expense_summary_router, prefix='/api')
app.include_router(dashboard_router, prefix='/api')
app.include_router(category_router, prefix='/api')
app.include_router(invitation_router, prefix='/api')
app.include_router(notification_router, prefix='/api')
app.include_router(contact_router, prefix='/api')
app.include_router(balance_router, prefix='/api')
app.include_router(settlement_router, prefix='/api')
app.include_router(receipt_router, prefix='/api')
app.include_router(recurring_expense_router, prefix='/api')
app.include_router(income_router, prefix='/api')
app.include_router(budget_router, prefix='/api')
app.include_router(savings_goal_router, prefix='/api')


@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try:
        auth_service = AuthService(db)
        auth_service.create_admin()
        seed_default_categories(db)
    finally:
        db.close()

    await recurring_scheduler.start()
    if settings.BUDGET_ROLLOVER_SCHEDULER_ENABLED:
        await budget_rollover_scheduler.start()
    await notification_scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    await recurring_scheduler.stop()
    await budget_rollover_scheduler.stop()
    await notification_scheduler.stop()

@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} API is running!"}