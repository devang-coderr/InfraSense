"""add work order field action tracking

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-28

Adds title, description, completion_notes, verified_at, verified_by to work_orders table
for Task 10 Authority Work Order Management & Field Action Tracking.
"""
from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("work_orders") as batch_op:
        batch_op.add_column(sa.Column("title", sa.String(length=160), nullable=True))
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("completion_notes", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("verified_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("verified_by", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("work_orders") as batch_op:
        batch_op.drop_column("verified_by")
        batch_op.drop_column("verified_at")
        batch_op.drop_column("completion_notes")
        batch_op.drop_column("description")
        batch_op.drop_column("title")
