"""add evidence verification fields to issue_media

Revision ID: b2c3d4e5f6a7
Revises: ff5cd99a6c80
Create Date: 2026-09-27

Adds device capture and EXIF metadata extraction/verification columns to issue_media.
"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "ff5cd99a6c80"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("issue_media") as batch_op:
        batch_op.add_column(sa.Column("device_latitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("device_longitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("device_captured_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("exif_latitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("exif_longitude", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("exif_captured_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("camera_make", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("camera_model", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("gps_distance_meters", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("gps_consistency", sa.String(length=20), nullable=False, server_default="unavailable"))
        batch_op.add_column(sa.Column("time_difference_seconds", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("time_consistency", sa.String(length=20), nullable=False, server_default="unavailable"))


def downgrade() -> None:
    with op.batch_alter_table("issue_media") as batch_op:
        batch_op.drop_column("time_consistency")
        batch_op.drop_column("time_difference_seconds")
        batch_op.drop_column("gps_consistency")
        batch_op.drop_column("gps_distance_meters")
        batch_op.drop_column("camera_model")
        batch_op.drop_column("camera_make")
        batch_op.drop_column("exif_captured_at")
        batch_op.drop_column("exif_longitude")
        batch_op.drop_column("exif_latitude")
        batch_op.drop_column("device_captured_at")
        batch_op.drop_column("device_longitude")
        batch_op.drop_column("device_latitude")
