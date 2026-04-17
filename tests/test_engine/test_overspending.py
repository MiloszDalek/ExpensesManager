from decimal import Decimal

from helpers.builders import add_expense, add_income, create_budget, create_pool
from helpers.engine import run


def test_pool_overspending_marks_exceeded(db, engine):
    budget = create_budget(db)
    overspent_pool = create_pool(db, budget.id, 1000)
    add_income(db, budget.id, 10000)
    add_expense(db, budget.id, 1500)

    result = run(engine, budget.id)
    states_by_pool_id = {state["pool_id"]: state for state in result.pool_states}
    pool_state = states_by_pool_id[overspent_pool.id]

    assert pool_state["remaining_amount"] == Decimal("-500.00")
    assert pool_state["status"] == "EXCEEDED"
