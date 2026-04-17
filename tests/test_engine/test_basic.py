from decimal import Decimal

from helpers.builders import add_expense, add_income, create_budget
from helpers.engine import run


def test_basic_recalculation_summary(db, engine):
    budget = create_budget(db)
    add_income(db, budget.id, 10000)
    add_expense(db, budget.id, 4000)

    result = run(engine, budget.id)

    assert result.summary["total_income"] == Decimal("10000.00")
    assert result.summary["total_expenses"] == Decimal("4000.00")
    assert result.summary["remaining_budget"] == Decimal("6000.00")
