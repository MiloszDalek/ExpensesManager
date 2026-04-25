"""extend notification system

Revision ID: 20260425_042607
Revises: 31f66dd04db0
Create Date: 2026-04-25 04:26:07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260425_042607'
down_revision: Union[str, Sequence[str], None] = '31f66dd04db0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create new enum types
    op.execute("""
        CREATE TYPE notification_context_type AS ENUM (
            'BUDGET',
            'EXPENSE',
            'GROUP',
            'SETTLEMENT',
            'GOAL',
            'RECURRING',
            'INVITATION'
        )
    """)
    
    op.execute("""
        CREATE TYPE notification_status AS ENUM (
            'UNREAD',
            'READ',
            'ARCHIVED'
        )
    """)
    
    op.execute("""
        CREATE TYPE aggregation_period AS ENUM (
            'DAILY',
            'WEEKLY',
            'MONTHLY',
            'YEARLY'
        )
    """)
    
    op.execute("""
        CREATE TYPE insight_type AS ENUM (
            'BUDGET_WARNING',
            'BUDGET_EXCEEDED',
            'SPENDING_SPIKE',
            'HIGH_CATEGORY_USAGE',
            'LOW_SAVINGS_RATE',
            'UPCOMING_PAYMENT',
            'GROUP_DEBT'
        )
    """)
    
    # Add new values to existing notification_type enum
    # Note: PostgreSQL requires ALTER TYPE for adding enum values
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INVITATION_RECEIVED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INVITATION_ACCEPTED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INVITATION_REJECTED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BUDGET_EXCEEDED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BUDGET_RESET'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NEW_EXPENSE_ADDED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'EXPENSE_UPDATED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'EXPENSE_DELETED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'RECURRING_DUE_SOON'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'RECURRING_EXECUTED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'RECURRING_FAILED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SETTLEMENT_PENDING'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SETTLEMENT_COMPLETED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SETTLEMENT_FAILED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GOAL_PROGRESS'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'GOAL_COMPLETED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'UNUSUAL_SPENDING'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'HIGH_SPENDING_CATEGORY'")

    op.execute("COMMIT")
    
    # Add new columns to notifications table
    op.add_column('notifications', sa.Column('reference_type', sa.Enum(
        'BUDGET', 'EXPENSE', 'GROUP', 'SETTLEMENT', 'GOAL', 'RECURRING', 'INVITATION',
        name='notification_context_type'
    ), nullable=True))
    
    op.add_column('notifications', sa.Column('status', sa.Enum(
        'UNREAD', 'READ', 'ARCHIVED',
        name='notification_status'
    ), nullable=False, server_default='UNREAD'))
    
    # Migrate existing data - set status based on is_read
    op.execute("""
        UPDATE notifications 
        SET status = CASE 
            WHEN is_read = true THEN 'READ'::notification_status 
            ELSE 'UNREAD'::notification_status 
        END
    """)
    
    # Migrate existing data - set reference_type based on notification type
    op.execute("""
        UPDATE notifications 
        SET reference_type = CASE
            WHEN type IN ('INVITATION', 'INVITATION_RECEIVED', 'INVITATION_ACCEPTED', 'INVITATION_REJECTED') 
                THEN 'INVITATION'::notification_context_type
            WHEN type::text LIKE 'BUDGET%' 
                THEN 'BUDGET'::notification_context_type
            WHEN type::text LIKE 'RECURRING%' OR type = 'UPCOMING_RECURRING_EXPENSE'
                THEN 'RECURRING'::notification_context_type
            WHEN type::text LIKE 'SETTLEMENT%' 
                THEN 'SETTLEMENT'::notification_context_type
            WHEN type::text LIKE 'GOAL%' 
                THEN 'GOAL'::notification_context_type
            WHEN type::text LIKE 'EXPENSE%' OR type = 'NEW_EXPENSE_ADDED' 
                THEN 'EXPENSE'::notification_context_type
            ELSE NULL
        END
        WHERE reference_type IS NULL
    """)
    
    # Drop old is_read column (after data migration)
    op.drop_column('notifications', 'is_read')


def downgrade() -> None:
    """Downgrade schema."""
    # Add back is_read column
    op.add_column('notifications', sa.Column('is_read', sa.Boolean(), server_default='false', nullable=True))
    
    # Migrate status back to is_read
    op.execute("""
        UPDATE notifications 
        SET is_read = CASE 
            WHEN status = 'READ' THEN true 
            ELSE false 
        END
    """)
    
    # Drop new columns
    op.drop_column('notifications', 'status')
    op.drop_column('notifications', 'reference_type')
    
    # Drop new enum types
    op.execute('DROP TYPE IF EXISTS insight_type')
    op.execute('DROP TYPE IF EXISTS aggregation_period')
    op.execute('DROP TYPE IF EXISTS notification_status')
    op.execute('DROP TYPE IF EXISTS notification_context_type')
    
    # Note: Cannot easily remove values from notification_type enum in PostgreSQL
    # Would require recreating the enum and migrating data
