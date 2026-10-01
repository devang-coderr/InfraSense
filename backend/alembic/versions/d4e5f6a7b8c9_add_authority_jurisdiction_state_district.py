"""add authority jurisdiction state district

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-28

Adds organization, state, district to users table and state, district to issues table
for State + District based authority jurisdiction scoping.
"""
from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("organization", sa.String(length=160), nullable=True))
        batch_op.add_column(sa.Column("state", sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column("district", sa.String(length=80), nullable=True))

    with op.batch_alter_table("issues") as batch_op:
        batch_op.add_column(sa.Column("state", sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column("district", sa.String(length=80), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("issues") as batch_op:
        batch_op.drop_column("district")
        batch_op.drop_column("state")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("district")
        batch_op.drop_column("state")
        batch_op.drop_column("organization")
