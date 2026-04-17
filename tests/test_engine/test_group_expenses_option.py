from decimal import Decimal

from helpers.builders import add_group_share_expense, add_income, create_budget
from helpers.engine import run


def test_group_shares_not_counted_when_option_disabled(db, engine):
    budget = create_budget(db, include_group_expenses=False)
    add_income(db, budget.id, 5000)
    add_group_share_expense(db, budget.id, 1200)

    result = run(engine, budget.id)

    assert result.summary["total_income"] == Decimal("5000.00")
    assert result.summary["total_expenses"] == Decimal("0.00")
    assert result.summary["remaining_budget"] == Decimal("5000.00")


def test_group_shares_counted_when_option_enabled(db, engine):
    budget = create_budget(db, include_group_expenses=True)
    add_income(db, budget.id, 5000)
    add_group_share_expense(db, budget.id, 1200)

    result = run(engine, budget.id)

    assert result.summary["total_income"] == Decimal("5000.00")
    assert result.summary["total_expenses"] == Decimal("1200.00")
    assert result.summary["remaining_budget"] == Decimal("3800.00")
