"""Drop budget cache tables (budget_pool_states, budget_period_summaries, goal_states)

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-05-20 00:00:00.000000

Rationale:
    The three tables removed here were derived/cache structures duplicating
    fields already persisted on `budget_pools` and `savings_goals`. All values
    they stored (allocated/spent/remaining amounts, totals, progress, status)
    are recomputable at query time. Their removal eliminates synchronization
    code paths and a class of stale-cache bugs.

    `savings_goal_allocations` is intentionally NOT removed - it is the
    source of truth for goal progress (current_amount is derived as SUM of
    allocations), enforces auto-allocation idempotency per budget period,
    and powers the allocation history UI.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: drop derived cache tables."""
    op.drop_table("goal_states")
    op.drop_table("budget_pool_states")
    op.drop_table("budget_period_summaries")


def downgrade() -> None:
    """Downgrade schema: recreate empty cache tables.

    Tables are recreated without data. The application will repopulate
    derived values on the next recalculation cycle.
    """
    op.create_table(
        "budget_period_summaries",
        sa.Column("budget_id", sa.Integer(), nullable=False),
        sa.Column("total_income", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("total_expenses", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("total_savings", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("remaining_budget", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("overspend_flag", sa.Boolean(), nullable=False),
        sa.Column("last_recalculated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["budget_id"], ["budget_plans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("budget_id"),
    )

    op.create_table(
        "budget_pool_states",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("budget_id", sa.Integer(), nullable=False),
        sa.Column("pool_id", sa.Integer(), nullable=False),
        sa.Column("allocated_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("spent_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("remaining_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("usage_percentage", sa.Numeric(precision=7, scale=2), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("last_recalculated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('ON_TRACK', 'WARNING', 'EXCEEDED')",
            name="check_budget_pool_states_status",
        ),
        sa.ForeignKeyConstraint(["budget_id"], ["budget_plans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["pool_id"], ["budget_pools.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("budget_id", "pool_id", name="uq_budget_pool_states_budget_pool"),
    )

    op.create_table(
        "goal_states",
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("budget_id", sa.Integer(), nullable=True),
        sa.Column("current_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("target_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("progress_percentage", sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("last_recalculated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'COMPLETED', 'PAUSED')",
            name="check_goal_states_status",
        ),
        sa.ForeignKeyConstraint(["budget_id"], ["budget_plans.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["goal_id"], ["savings_goals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("goal_id"),
    )
