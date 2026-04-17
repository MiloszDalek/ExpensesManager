from decimal import Decimal

from helpers.builders import add_income, create_budget, create_pool
from helpers.engine import run


def test_pool_allocations_match_configuration(db, engine):
    budget = create_budget(db)
    pool_a = create_pool(db, budget.id, 2000)
    pool_b = create_pool(db, budget.id, 1000)
    add_income(db, budget.id, 10000)

    result = run(engine, budget.id)
    states_by_pool_id = {state["pool_id"]: state for state in result.pool_states}

    assert states_by_pool_id[pool_a.id]["allocated_amount"] == Decimal("2000.00")
    assert states_by_pool_id[pool_b.id]["allocated_amount"] == Decimal("1000.00")
