from helpers.builders import add_expense, add_income, create_budget
from helpers.engine import run


def test_recalculation_is_idempotent_for_summary_and_pool_states(db, engine):
    budget = create_budget(db)
    add_income(db, budget.id, 5000)
    add_expense(db, budget.id, 1000)

    first = run(engine, budget.id)
    second = run(engine, budget.id)

    assert first.summary == second.summary
    assert first.pool_states == second.pool_states
