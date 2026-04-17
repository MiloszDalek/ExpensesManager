from helpers.builders import create_budget
from helpers.engine import run


def test_goal_states_exist_and_engine_does_not_crash(db, engine):
    budget = create_budget(db)

    result = run(engine, budget.id)

    assert hasattr(result, "goal_states")
    assert isinstance(result.goal_states, list)
