"""add alert fields to notifications

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-28

Adds severity, reason, status, acknowledged_at, resolved_at to notifications table
for Task 9 Jurisdiction-Aware Alert Engine + Alert Lifecycle.
"""
from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("notifications") as batch_op:
        batch_op.add_column(sa.Column("severity", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("reason", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("status", sa.String(length=30), nullable=False, server_default="unread"))
        batch_op.add_column(sa.Column("acknowledged_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("resolved_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("notifications") as batch_op:
        batch_op.drop_column("resolved_at")
        batch_op.drop_column("acknowledged_at")
        batch_op.drop_column("status")
        batch_op.drop_column("reason")
        batch_op.drop_column("severity")
