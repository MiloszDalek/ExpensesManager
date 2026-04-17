from datetime import datetime, time
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.enums import (
    BudgetAllocationStrategy,
    BudgetPeriodType,
    BudgetPoolType,
    BudgetStatus,
    CategorySection,
    CurrencyEnum,
    GroupMemberRole,
    GroupMemberStatus,
    GroupStatus,
    SplitType,
    SystemUserRole,
)
from app.models import BudgetPlan, BudgetPool, Category, Expense, ExpenseShare, Group, GroupMember, IncomeEntry, User


def _money(value: int | float | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _build_test_user(db: Session) -> User:
    suffix = db.query(User).count() + 1
    user = User(
        email=f"test.user.{suffix}@example.com",
        username=f"test_user_{suffix}",
        hashed_password="test-password-hash",
        is_active=True,
        role=SystemUserRole.USER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _get_or_create_personal_category(db: Session, user_id: int) -> Category:
    existing = (
        db.query(Category)
        .filter(Category.user_id == user_id, Category.group_id.is_(None))
        .order_by(Category.id.asc())
        .first()
    )
    if existing:
        return existing

    category = Category(
        name=f"test_category_{user_id}",
        section=CategorySection.OTHER,
        user_id=user_id,
        group_id=None,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def create_budget(db: Session, include_group_expenses: bool = False) -> BudgetPlan:
    user = _build_test_user(db)
    _get_or_create_personal_category(db, user.id)

    budget = BudgetPlan(
        user_id=user.id,
        name=f"Test Budget {user.id}",
        currency=CurrencyEnum.PLN,
        period_type=BudgetPeriodType.MONTHLY,
        allocation_strategy=BudgetAllocationStrategy.PERCENT_INCOME,
        period_start=datetime(2026, 1, 1).date(),
        period_end=datetime(2026, 1, 31).date(),
        income_target=None,
        include_group_expenses=include_group_expenses,
        status=BudgetStatus.ACTIVE,
        template_key=None,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def add_income(db: Session, budget_id: int, amount: int | float | Decimal) -> IncomeEntry:
    budget = db.query(BudgetPlan).filter(BudgetPlan.id == budget_id).first()
    if budget is None:
        raise ValueError(f"Budget with id={budget_id} was not found")

    income = IncomeEntry(
        user_id=budget.user_id,
        title="Test income",
        source="tests",
        amount=_money(amount),
        currency=budget.currency,
        income_date=datetime.combine(budget.period_start, time(hour=12, minute=0)),
        notes="created by tests",
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


def add_expense(db: Session, budget_id: int, amount: int | float | Decimal) -> Expense:
    budget = db.query(BudgetPlan).filter(BudgetPlan.id == budget_id).first()
    if budget is None:
        raise ValueError(f"Budget with id={budget_id} was not found")

    first_pool = (
        db.query(BudgetPool)
        .filter(BudgetPool.budget_id == budget.id)
        .order_by(BudgetPool.id.asc())
        .first()
    )
    if first_pool is not None:
        category_id = first_pool.category_id
    else:
        category_id = _get_or_create_personal_category(db, budget.user_id).id

    expense = Expense(
        user_id=budget.user_id,
        group_id=None,
        title="Test expense",
        amount=_money(amount),
        currency=budget.currency,
        split_type=None,
        category_id=category_id,
        expense_date=datetime.combine(budget.period_start, time(hour=13, minute=0)),
        notes="created by tests",
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def create_pool(db: Session, budget_id: int, amount: int | float | Decimal) -> BudgetPool:
    budget = db.query(BudgetPlan).filter(BudgetPlan.id == budget_id).first()
    if budget is None:
        raise ValueError(f"Budget with id={budget_id} was not found")

    category = _get_or_create_personal_category(db, budget.user_id)
    current_count = db.query(BudgetPool).filter(BudgetPool.budget_id == budget.id).count()

    pool = BudgetPool(
        budget_id=budget.id,
        category_id=category.id,
        name=f"Test pool {current_count + 1}",
        pool_type=BudgetPoolType.FIXED_AMOUNT,
        target_value=_money(amount),
        alert_threshold=_money(80),
        allocated_amount=_money(0),
        spent_amount=_money(0),
        remaining_amount=_money(0),
        rollover_amount=_money(0),
        rollover_enabled=True,
        rollover_negative_enabled=False,
        last_recalculated_at=None,
    )
    db.add(pool)
    db.commit()
    db.refresh(pool)
    return pool


def _create_group_for_user(db: Session, user_id: int, currency: CurrencyEnum) -> Group:
    suffix = db.query(Group).filter(Group.created_by == user_id).count() + 1
    group = Group(
        name=f"test_group_{user_id}_{suffix}",
        description="created by tests",
        status=GroupStatus.ACTIVE,
        currency=currency,
        created_by=user_id,
    )
    db.add(group)
    db.flush()

    db.add(
        GroupMember(
            group_id=group.id,
            user_id=user_id,
            role=GroupMemberRole.ADMIN,
            status=GroupMemberStatus.ACTIVE,
        )
    )
    db.flush()
    return group


def add_group_share_expense(db: Session, budget_id: int, share_amount: int | float | Decimal) -> Expense:
    budget = db.query(BudgetPlan).filter(BudgetPlan.id == budget_id).first()
    if budget is None:
        raise ValueError(f"Budget with id={budget_id} was not found")

    first_pool = (
        db.query(BudgetPool)
        .filter(BudgetPool.budget_id == budget.id)
        .order_by(BudgetPool.id.asc())
        .first()
    )
    if first_pool is not None:
        category_id = first_pool.category_id
    else:
        category_id = _get_or_create_personal_category(db, budget.user_id).id

    group = _create_group_for_user(db, budget.user_id, budget.currency)

    expense = Expense(
        user_id=budget.user_id,
        group_id=group.id,
        title="Test group expense",
        amount=_money(share_amount),
        currency=budget.currency,
        split_type=SplitType.EXACT,
        category_id=category_id,
        expense_date=datetime.combine(budget.period_start, time(hour=14, minute=0)),
        notes="created by tests",
    )
    db.add(expense)
    db.flush()

    db.add(
        ExpenseShare(
            expense_id=expense.id,
            user_id=budget.user_id,
            share_amount=_money(share_amount),
        )
    )
    db.commit()
    db.refresh(expense)
    return expense
