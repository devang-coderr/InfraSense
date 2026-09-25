"""initial schema

Revision ID: ff5cd99a6c80
Revises:
Create Date: 2026-08-23

This migration was hand-written to mirror app/database/models/*.py exactly
(generated in an environment without network access to run
`alembic revision --autogenerate`). If you change a model, prefer running
autogenerate for the next migration — see README "Database migrations".

NOTE: enum-backed columns (role, severity, status, etc.) are stored as
plain VARCHAR here rather than native Postgres ENUM types, to keep this
migration portable across SQLite and Postgres without extra CREATE TYPE
statements. Valid values are enforced at the application layer
(app/database/models/enums.py + Pydantic schemas).
"""
from alembic import op
import sqlalchemy as sa

revision = "ff5cd99a6c80"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(80), nullable=False, unique=True),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "wards",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(80), nullable=False, unique=True),
        sa.Column("center_lat", sa.Float, nullable=False),
        sa.Column("center_lng", sa.Float, nullable=False),
        sa.Column("population", sa.Integer, nullable=True),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(180), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(30), nullable=False, server_default="citizen"),
        sa.Column("department_id", sa.Integer, sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "issues",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("image_description", sa.Text, nullable=False, server_default=""),
        sa.Column("reported_by", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),
        sa.Column("ward_id", sa.Integer, sa.ForeignKey("wards.id"), nullable=True),
        sa.Column("severity", sa.String(20), nullable=False, server_default="low"),
        sa.Column("severity_score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("priority_score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("confidence", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="reported"),
        sa.Column("department_id", sa.Integer, sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("duplicate_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("reported_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "issue_severity_factors",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("issue_id", sa.Integer, sa.ForeignKey("issues.id"), nullable=False),
        sa.Column("label", sa.String(80), nullable=False),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("max", sa.Integer, nullable=False),
    )

    op.create_table(
        "issue_priority_factors",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("issue_id", sa.Integer, sa.ForeignKey("issues.id"), nullable=False),
        sa.Column("label", sa.String(80), nullable=False),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("max", sa.Integer, nullable=False),
    )

    op.create_table(
        "issue_media",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("issue_id", sa.Integer, sa.ForeignKey("issues.id"), nullable=True),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_type", sa.String(50), nullable=False),
        sa.Column("media_type", sa.String(20), nullable=False, server_default="image"),
        sa.Column("uploaded_by", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "ai_analysis",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("issue_id", sa.Integer, sa.ForeignKey("issues.id"), nullable=False),
        sa.Column("model_name", sa.String(80), nullable=False),
        sa.Column("model_version", sa.String(40), nullable=False),
        sa.Column("is_baseline", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("confidence", sa.Integer, nullable=False),
        sa.Column("severity_score", sa.Integer, nullable=False),
        sa.Column("damage_size", sa.Integer, nullable=False, server_default="0"),
        sa.Column("road_importance", sa.Integer, nullable=False, server_default="0"),
        sa.Column("traffic_exposure", sa.Integer, nullable=False, server_default="0"),
        sa.Column("nearby_risk", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "issue_duplicates",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("master_issue_id", sa.Integer, sa.ForeignKey("issues.id"), nullable=False),
        sa.Column("duplicate_issue_id", sa.Integer, sa.ForeignKey("issues.id"), nullable=False),
        sa.Column("similarity_score", sa.Float, nullable=False),
        sa.Column("distance_meters", sa.Float, nullable=False),
        sa.Column("reason", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "work_orders",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("issue_id", sa.Integer, sa.ForeignKey("issues.id"), nullable=False),
        sa.Column("department_id", sa.Integer, sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("assigned_to", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("priority", sa.Integer, nullable=False, server_default="0"),
        sa.Column("deadline", sa.DateTime, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="assigned"),
        sa.Column("started_at", sa.DateTime, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "resolution_evidence",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("work_order_id", sa.Integer, sa.ForeignKey("work_orders.id"), nullable=False, unique=True),
        sa.Column("before_image_url", sa.String(500), nullable=True),
        sa.Column("after_image_url", sa.String(500), nullable=True),
        sa.Column("ai_verification_score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("ai_verification_status", sa.String(60), nullable=False, server_default="pending"),
        sa.Column("authority_confirmed", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "ward_risk_predictions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("ward_id", sa.Integer, sa.ForeignKey("wards.id"), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("risk_score", sa.Integer, nullable=False),
        sa.Column("prediction_window", sa.String(60), nullable=False, server_default="Next 30 days"),
        sa.Column("reasons", sa.JSON, nullable=False),
        sa.Column("recommended_actions", sa.JSON, nullable=False),
        sa.Column("model_name", sa.String(80), nullable=False, server_default="baseline-rule-based"),
        sa.Column("is_baseline", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("issue_id", sa.Integer, sa.ForeignKey("issues.id"), nullable=True),
        sa.Column("type", sa.String(60), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("ward_risk_predictions")
    op.drop_table("resolution_evidence")
    op.drop_table("work_orders")
    op.drop_table("issue_duplicates")
    op.drop_table("ai_analysis")
    op.drop_table("issue_media")
    op.drop_table("issue_priority_factors")
    op.drop_table("issue_severity_factors")
    op.drop_table("issues")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("wards")
    op.drop_table("departments")
