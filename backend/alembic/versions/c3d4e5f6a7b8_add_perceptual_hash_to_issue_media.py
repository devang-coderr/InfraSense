"""add perceptual_hash to issue_media

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-27

Adds perceptual_hash column to issue_media for visual similarity duplicate detection.
"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("issue_media") as batch_op:
        batch_op.add_column(sa.Column("perceptual_hash", sa.String(length=32), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("issue_media") as batch_op:
        batch_op.drop_column("perceptual_hash")
