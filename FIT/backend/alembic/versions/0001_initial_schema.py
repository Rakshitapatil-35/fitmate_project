"""Initial schema for Size Recommendation Backend

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-11-14 22:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "token_blacklist",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("jti", sa.String(length=64), nullable=False, unique=True),
        sa.Column("token_type", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_token_blacklist_jti", "token_blacklist", ["jti"], unique=True)

    op.create_table(
        "body_measurement_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_name", sa.String(length=120), nullable=False),
        sa.Column("gender", sa.String(length=32), nullable=False),
        sa.Column("fit_preference", sa.String(length=32), nullable=False),
        sa.Column("original_unit", sa.String(length=10), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("chest_bust_cm", sa.Float(), nullable=True),
        sa.Column("underbust_cm", sa.Float(), nullable=True),
        sa.Column("shoulder_cm", sa.Float(), nullable=True),
        sa.Column("sleeve_cm", sa.Float(), nullable=True),
        sa.Column("torso_cm", sa.Float(), nullable=True),
        sa.Column("waist_cm", sa.Float(), nullable=True),
        sa.Column("hips_cm", sa.Float(), nullable=True),
        sa.Column("inseam_cm", sa.Float(), nullable=True),
        sa.Column("thigh_cm", sa.Float(), nullable=True),
        sa.Column("rise_cm", sa.Float(), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "brands",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False, unique=True),
        sa.Column("slug", sa.String(length=150), nullable=False, unique=True),
        sa.Column("website_domain", sa.String(length=255), nullable=True),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("sizing_system", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "clothing_categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=64), nullable=False, unique=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("gender", sa.String(length=32), nullable=False),
        sa.Column("garment_group", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("brand_id", sa.Integer(), sa.ForeignKey("brands.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("clothing_categories.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("external_product_id", sa.String(length=150), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("product_url", sa.String(length=500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("primary_fabric", sa.String(length=120), nullable=True),
        sa.Column("fabric_composition", sa.String(length=255), nullable=True),
        sa.Column("stretch_percentage", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("intended_fit", sa.String(length=32), nullable=False, server_default="regular"),
        sa.Column("available_sizes_csv", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "size_charts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("brand_id", sa.Integer(), sa.ForeignKey("brands.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("clothing_categories.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("source_url", sa.String(length=500), nullable=True),
        sa.Column("data_source", sa.String(length=150), nullable=False),
        sa.Column("verification_status", sa.String(length=32), nullable=False, server_default="estimated"),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "garment_measurements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "size_chart_id",
            sa.Integer(),
            sa.ForeignKey("size_charts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("size_label", sa.String(length=32), nullable=False),
        sa.Column("size_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chest_bust_cm", sa.Float(), nullable=True),
        sa.Column("underbust_cm", sa.Float(), nullable=True),
        sa.Column("shoulder_cm", sa.Float(), nullable=True),
        sa.Column("sleeve_cm", sa.Float(), nullable=True),
        sa.Column("torso_cm", sa.Float(), nullable=True),
        sa.Column("waist_cm", sa.Float(), nullable=True),
        sa.Column("hips_cm", sa.Float(), nullable=True),
        sa.Column("inseam_cm", sa.Float(), nullable=True),
        sa.Column("thigh_cm", sa.Float(), nullable=True),
        sa.Column("rise_cm", sa.Float(), nullable=True),
        sa.Column("stretch_percentage_override", sa.Float(), nullable=True),
        sa.Column("data_source", sa.String(length=150), nullable=False),
        sa.Column("verification_status", sa.String(length=32), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("size_chart_id", "size_label", name="uq_size_chart_size_label"),
    )

    op.create_table(
        "recommendations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "measurement_profile_id",
            sa.Integer(),
            sa.ForeignKey("body_measurement_profiles.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("size_chart_id", sa.Integer(), sa.ForeignKey("size_charts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recommended_size", sa.String(length=32), nullable=False),
        sa.Column("fit_category", sa.String(length=32), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("fit_preference_used", sa.String(length=32), nullable=False),
        sa.Column("strategy_used", sa.String(length=64), nullable=False),
        sa.Column("method_used", sa.String(length=64), nullable=False),
        sa.Column("fallback_used", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("model_version", sa.String(length=64), nullable=False),
        sa.Column("ranked_sizes_json", sa.Text(), nullable=False),
        sa.Column("explanation_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "prediction_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "recommendation_id",
            sa.Integer(),
            sa.ForeignKey("recommendations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("model_version", sa.String(length=64), nullable=False),
        sa.Column("input_payload_json", sa.Text(), nullable=False),
        sa.Column("output_payload_json", sa.Text(), nullable=False),
        sa.Column("predicted_size", sa.String(length=32), nullable=False),
        sa.Column("fit_category", sa.String(length=32), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("latency_ms", sa.Float(), nullable=False),
        sa.Column("fallback_used", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("fallback_reason", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "fit_feedbacks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "recommendation_id",
            sa.Integer(),
            sa.ForeignKey("recommendations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actual_size_worn", sa.String(length=32), nullable=False),
        sa.Column("overall_fit", sa.String(length=32), nullable=False),
        sa.Column("fit_category_label", sa.String(length=32), nullable=False),
        sa.Column("accepted_recommendation", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("chest_bust_note", sa.String(length=120), nullable=True),
        sa.Column("shoulder_note", sa.String(length=120), nullable=True),
        sa.Column("waist_note", sa.String(length=120), nullable=True),
        sa.Column("hips_note", sa.String(length=120), nullable=True),
        sa.Column("length_note", sa.String(length=120), nullable=True),
        sa.Column("sleeve_note", sa.String(length=120), nullable=True),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("fit_feedbacks")
    op.drop_table("prediction_logs")
    op.drop_table("recommendations")
    op.drop_table("garment_measurements")
    op.drop_table("size_charts")
    op.drop_table("products")
    op.drop_table("clothing_categories")
    op.drop_table("brands")
    op.drop_table("body_measurement_profiles")
    op.drop_table("token_blacklist")
    op.drop_table("users")
