from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, List
from fastapi import HTTPException

from app.repositories import (
    BudgetRepository,
    ExpenseRepository,
    SettlementRepository,
    NotificationRepository
)
from app.schemas.dashboard_schemas import (
    KPISummaryResponse,
    AttentionItem,
    TrendDataResponse,
    TrendDataPoint,
    CategoryBreakdownResponse,
    CategoryBreakdownItem,
    BudgetStatusResponse,
    BudgetPoolStatusResponse,
    SettlementSnapshotResponse,
)
from app.enums import (
    InsightType,
    NotificationSeverity,
    AggregationPeriod,
    BudgetStatus,
    SettlementStatus,
    NotificationStatus,
    RecurringExpenseStatus
)


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.budget_repo = BudgetRepository(db)
        self.expense_repo = ExpenseRepository(db)
        self.settlement_repo = SettlementRepository(db)
        self.notification_repo = NotificationRepository(db)

    def get_kpi_summary(
        self, 
        user_id: int, 
        budget_id: Optional[int] = None
    ) -> KPISummaryResponse:
        """Get KPI summary from budget_period_summaries."""
        # If no budget_id specified, get the most recent active budget
        if budget_id is None:
            active_budgets = self.budget_repo.list_plans_by_user(user_id, BudgetStatus.ACTIVE)
            if not active_budgets:
                # Return zero values if no active budget
                return KPISummaryResponse(
                    total_income=Decimal("0"),
                    total_expenses=Decimal("0"),
                    total_savings=Decimal("0"),
                    remaining_budget=Decimal("0"),
                    overspend_flag=False
                )
            budget = active_budgets[0]
            budget_id = budget.id
        else:
            budget = self.budget_repo.get_plan_by_id_for_user(budget_id, user_id)
            if not budget:
                raise HTTPException(status_code=404, detail="Budget not found")

        # Get period summary
        summary = self.budget_repo.get_budget_period_summary(budget_id)
        
        if not summary:
            # No summary yet, return zeros
            return KPISummaryResponse(
                total_income=Decimal("0"),
                total_expenses=Decimal("0"),
                total_savings=Decimal("0"),
                remaining_budget=Decimal("0"),
                overspend_flag=False,
                budget_id=budget_id,
                budget_name=budget.name,
                period_start=budget.period_start.isoformat(),
                period_end=budget.period_end.isoformat()
            )

        return KPISummaryResponse(
            total_income=summary.total_income,
            total_expenses=summary.total_expenses,
            total_savings=summary.total_savings,
            remaining_budget=summary.remaining_budget,
            overspend_flag=summary.overspend_flag,
            budget_id=budget_id,
            budget_name=budget.name,
            period_start=budget.period_start.isoformat(),
            period_end=budget.period_end.isoformat()
        )

    def get_attention_items(
        self, 
        user_id: int, 
        limit: int = 10
    ) -> List[AttentionItem]:
        """Generate priority-sorted list of items needing attention."""
        items: List[AttentionItem] = []

        # 1. Check for exceeded budgets (highest priority)
        active_budgets = self.budget_repo.list_plans_by_user(user_id, BudgetStatus.ACTIVE)
        for budget in active_budgets:
            pool_states = self.budget_repo.list_budget_pool_states(budget.id)
            for state in pool_states:
                if state.status == "EXCEEDED":
                    pool = next((p for p in budget.pools if p.id == state.pool_id), None)
                    category_name = pool.category.name if pool and pool.category else f"Pool {state.pool_id}"
                    
                    items.append(AttentionItem(
                        id=f"budget_exceeded_{state.pool_id}",
                        type=InsightType.BUDGET_EXCEEDED,
                        title=f"{category_name} budget exceeded",
                        description=f"You've spent {state.spent_amount:.2f} of {state.allocated_amount:.2f} allocated",
                        severity=NotificationSeverity.URGENT,
                        action_url=f"/budgets?budget_id={budget.id}",
                        priority=1,
                        reference_id=state.pool_id
                    ))

        # 2. Check for budget warnings
        for budget in active_budgets:
            pool_states = self.budget_repo.list_budget_pool_states(budget.id)
            for state in pool_states:
                if state.status == "WARNING" and state.usage_percentage:
                    pool = next((p for p in budget.pools if p.id == state.pool_id), None)
                    if not pool:
                        continue
                    
                    category_name = pool.category.name if pool.category else f"Pool {state.pool_id}"
                    
                    if float(state.usage_percentage) >= float(pool.alert_threshold):
                        items.append(AttentionItem(
                            id=f"budget_warning_{state.pool_id}",
                            type=InsightType.BUDGET_WARNING,
                            title=f"{category_name} nearing limit",
                            description=f"You're at {state.usage_percentage:.1f}% of your budget",
                            severity=NotificationSeverity.WARNING,
                            action_url=f"/budgets?budget_id={budget.id}",
                            priority=2,
                            reference_id=state.pool_id
                        ))

        # 3. Check for upcoming recurring expenses (next 7 days)
        from app.models import RecurringExpense
        lookahead_date = date.today() + timedelta(days=7)
        upcoming_recurring = (
            self.db.query(RecurringExpense)
            .filter(
                RecurringExpense.user_id == user_id,
                RecurringExpense.status == RecurringExpenseStatus.ACTIVE,
                RecurringExpense.next_due_on <= lookahead_date,
                RecurringExpense.next_due_on >= date.today()
            )
            .all()
        )

        for recurring in upcoming_recurring:
            days_until = (recurring.next_due_on - date.today()).days
            items.append(AttentionItem(
                id=f"recurring_due_{recurring.id}",
                type=InsightType.UPCOMING_PAYMENT,
                title=f"{recurring.name} due soon",
                description=f"Due in {days_until} day{'s' if days_until != 1 else ''}",
                severity=NotificationSeverity.WARNING if days_until <= 3 else NotificationSeverity.INFO,
                action_url="/personal?tab=recurring",
                priority=3 if days_until <= 3 else 4,
                reference_id=recurring.id
            ))

        # 4. Check for pending settlements
        from app.models import Settlement
        pending_settlements = (
            self.db.query(Settlement)
            .filter(
                Settlement.from_user_id == user_id,
                Settlement.status == SettlementStatus.PENDING
            )
            .all()
        )

        for settlement in pending_settlements:
            items.append(AttentionItem(
                id=f"settlement_pending_{settlement.id}",
                type=InsightType.GROUP_DEBT,
                title="Settlement pending",
                description=f"You owe {settlement.amount:.2f} {settlement.currency}",
                severity=NotificationSeverity.URGENT,
                action_url=f"/groups?settlement_id={settlement.id}",
                priority=2,
                reference_id=settlement.id
            ))

        # 5. Check for unread urgent notifications
        urgent_unread = self.notification_repo.get_by_user_filtered(
            user_id=user_id,
            status=NotificationStatus.UNREAD,
            limit=5,
            offset=0
        )

        for notification in urgent_unread[:3]:  # Top 3 only
            if notification.severity == NotificationSeverity.URGENT:
                items.append(AttentionItem(
                    id=f"notification_{notification.id}",
                    type=InsightType.BUDGET_WARNING,  # Generic type
                    title="Unread notification",
                    description=notification.message or "You have an important notification",
                    severity=NotificationSeverity.URGENT,
                    action_url=notification.action_url,
                    priority=3,
                    reference_id=notification.id
                ))

        # Sort by priority (ascending) and limit
        items.sort(key=lambda x: x.priority)
        return items[:limit]

    def get_spending_trend(
        self,
        user_id: int,
        period: AggregationPeriod = AggregationPeriod.DAILY,
        budget_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> TrendDataResponse:
        """Get spending trend data aggregated by period."""
        from app.models import Expense

        # Default date range if not specified
        if date_from is None or date_to is None:
            if budget_id:
                budget = self.budget_repo.get_plan_by_id_for_user(budget_id, user_id)
                if budget:
                    date_from = budget.period_start
                    date_to = budget.period_end
            
            if date_from is None:
                date_to = date.today()
                date_from = date_to - timedelta(days=30)

        # Build query
        query = self.db.query(
            func.date(Expense.expense_date).label('date'),
            func.sum(Expense.amount).label('total')
        ).filter(
            Expense.user_id == user_id,
            Expense.group_id.is_(None),  # Personal expenses only
            Expense.expense_date >= datetime.combine(date_from, datetime.min.time()),
            Expense.expense_date <= datetime.combine(date_to, datetime.max.time())
        )

        # Group by period
        if period == AggregationPeriod.DAILY:
            group_expr = func.date(Expense.expense_date)
        elif period == AggregationPeriod.WEEKLY:
            group_expr = func.date_trunc('week', Expense.expense_date)
        elif period == AggregationPeriod.MONTHLY:
            group_expr = func.date_trunc('month', Expense.expense_date)

        query = self.db.query(
            group_expr.label('date'),
            func.sum(Expense.amount).label('total')
        ).filter(
            Expense.user_id == user_id,
            Expense.group_id.is_(None),
            Expense.expense_date >= datetime.combine(date_from, datetime.min.time()),
            Expense.expense_date <= datetime.combine(date_to, datetime.max.time())
        ).group_by(group_expr).order_by(group_expr)

        results = query.all()

        # Format data points
        data_points = []
        total = Decimal("0")
        
        for row in results:
            amount = Decimal(row.total or 0)
            total += amount
            
            row_date = row.date.date() if hasattr(row.date, 'date') else row.date
            
            if period == AggregationPeriod.WEEKLY:
                label = f"Week {row_date.strftime('%b %d')}"
            elif period == AggregationPeriod.MONTHLY:
                label = row_date.strftime("%B %Y")
            else:
                label = row_date.strftime("%b %d")
            
            data_points.append(TrendDataPoint(
                period=row_date.isoformat(),
                amount=amount,
                label=label
            ))

        average = total / len(data_points) if data_points else Decimal("0")

        return TrendDataResponse(
            period_type=period,
            data_points=data_points,
            total=total,
            average=average,
            currency="PLN"  # TODO: Get from user preferences
        )

    def get_category_breakdown(
        self,
        user_id: int,
        budget_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> CategoryBreakdownResponse:
        """Get category spending breakdown with percentages."""
        from app.models import Expense, Category

        # Default date range
        if date_from is None or date_to is None:
            if budget_id:
                budget = self.budget_repo.get_plan_by_id_for_user(budget_id, user_id)
                if budget:
                    date_from = budget.period_start
                    date_to = budget.period_end
            
            if date_from is None:
                date_to = date.today()
                date_from = date_to - timedelta(days=30)

        # Query category totals
        results = (
            self.db.query(
                Expense.category_id,
                Category.name.label('category_name'),
                func.sum(Expense.amount).label('total')
            )
            .join(Category, Expense.category_id == Category.id)
            .filter(
                Expense.user_id == user_id,
                Expense.group_id.is_(None),
                Expense.expense_date >= datetime.combine(date_from, datetime.min.time()),
                Expense.expense_date <= datetime.combine(date_to, datetime.max.time())
            )
            .group_by(Expense.category_id, Category.name)
            .order_by(func.sum(Expense.amount).desc())
            .all()
        )

        # Calculate total and percentages
        total = sum(Decimal(row.total or 0) for row in results)
        
        items = []
        for row in results:
            amount = Decimal(row.total or 0)
            percentage = (amount / total * 100) if total > 0 else Decimal("0")
            
            items.append(CategoryBreakdownItem(
                category_id=row.category_id,
                category_name=row.category_name,
                amount=amount,
                percentage=percentage
            ))

        return CategoryBreakdownResponse(
            items=items,
            total=total,
            currency="USD"
        )

    def get_budget_status(
        self,
        user_id: int,
        budget_id: Optional[int] = None
    ) -> List[BudgetStatusResponse]:
        """Get budget pool status for active budgets."""
        if budget_id:
            budgets = [self.budget_repo.get_plan_by_id_for_user(budget_id, user_id)]
            if not budgets[0]:
                raise HTTPException(status_code=404, detail="Budget not found")
        else:
            budgets = self.budget_repo.list_plans_by_user(user_id, BudgetStatus.ACTIVE)

        response_list = []
        
        for budget in budgets:
            pool_states = self.budget_repo.list_budget_pool_states(budget.id)
            pool_responses = []

            for state in pool_states:
                pool = next((p for p in budget.pools if p.id == state.pool_id), None)
                if not pool:
                    continue

                pool_responses.append(BudgetPoolStatusResponse(
                    pool_id=state.pool_id,
                    category_id=pool.category_id,
                    category_name=pool.category.name if pool.category else f"Pool {state.pool_id}",
                    pool_type=pool.pool_type.value,
                    target_value=Decimal(pool.target_value),
                    allocated=Decimal(state.allocated_amount),
                    spent=Decimal(state.spent_amount),
                    remaining=Decimal(state.remaining_amount),
                    usage_percentage=Decimal(state.usage_percentage) if state.usage_percentage else None,
                    status=state.status,
                    alert_threshold=Decimal(pool.alert_threshold)
                ))

            response_list.append(BudgetStatusResponse(
                budget_id=budget.id,
                budget_name=budget.name,
                pools=pool_responses,
                period_start=budget.period_start.isoformat(),
                period_end=budget.period_end.isoformat(),
                currency=budget.currency.value
            ))

        return response_list

    def get_settlement_snapshot(self, user_id: int) -> SettlementSnapshotResponse:
        """Get settlement balance snapshot."""
        from app.models import Settlement

        # Total owed to me (I'm the creditor)
        owed_to_me = (
            self.db.query(func.sum(Settlement.amount))
            .filter(
                Settlement.to_user_id == user_id,
                Settlement.status == SettlementStatus.PENDING
            )
            .scalar() or Decimal("0")
        )

        # Total I owe (I'm the debtor)
        i_owe = (
            self.db.query(func.sum(Settlement.amount))
            .filter(
                Settlement.from_user_id == user_id,
                Settlement.status == SettlementStatus.PENDING
            )
            .scalar() or Decimal("0")
        )

        # Count pending settlements
        pending_count = (
            self.db.query(func.count(Settlement.id))
            .filter(
                or_(
                    Settlement.to_user_id == user_id,
                    Settlement.from_user_id == user_id
                ),
                Settlement.status == SettlementStatus.PENDING
            )
            .scalar() or 0
        )

        net_balance = Decimal(owed_to_me) - Decimal(i_owe)

        return SettlementSnapshotResponse(
            total_owed_to_me=Decimal(owed_to_me),
            total_i_owe=Decimal(i_owe),
            net_balance=net_balance,
            pending_settlements_count=pending_count,
            currency="USD"
        )
