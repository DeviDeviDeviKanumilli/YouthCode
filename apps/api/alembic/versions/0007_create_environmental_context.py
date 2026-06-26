"""create environmental context

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-26 00:00:06.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "environmental_context",
        sa.Column("observation_id", sa.UUID(), nullable=False),
        sa.Column("land_cover_class", sa.String(length=120), nullable=True),
        sa.Column("tree_canopy_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("impervious_surface_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("ndvi_value", sa.Numeric(5, 4), nullable=True),
        sa.Column("distance_to_water_m", sa.Numeric(10, 2), nullable=True),
        sa.Column("distance_to_road_m", sa.Numeric(10, 2), nullable=True),
        sa.Column("distance_to_trail_m", sa.Numeric(10, 2), nullable=True),
        sa.Column("distance_to_park_m", sa.Numeric(10, 2), nullable=True),
        sa.Column("elevation_m", sa.Numeric(10, 2), nullable=True),
        sa.Column("slope", sa.Numeric(8, 4), nullable=True),
        sa.Column("recent_precipitation", sa.Numeric(10, 2), nullable=True),
        sa.Column("recent_temperature", sa.Numeric(6, 2), nullable=True),
        sa.Column(
            "data_sources",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("enrichment_version", sa.String(length=120), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["observation_id"],
            ["observations.id"],
            name=op.f("fk_environmental_context_observation_id_observations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("observation_id", name=op.f("pk_environmental_context")),
    )


def downgrade() -> None:
    op.drop_table("environmental_context")
