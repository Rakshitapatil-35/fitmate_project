"""Add body_shape column to body_measurement_profiles

Revision ID: 0002_add_body_shape
Revises: 0001_initial_schema
Create Date: 2026-11-17 23:45:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_add_body_shape"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c["name"] for c in inspector.get_columns(table_name)]
    return column_name in cols


def upgrade() -> None:
    if not _column_exists("body_measurement_profiles", "body_shape"):
        op.add_column(
            "body_measurement_profiles",
            sa.Column("body_shape", sa.String(length=120), nullable=True),
        )


def downgrade() -> None:
    # SQLite has limited ALTER TABLE support; preserve column to ensure no data loss
    pass
