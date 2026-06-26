"""create sampling grid cells

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-26 00:00:12.000000
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

sampling_label = postgresql.ENUM(
    "well_sampled",
    "moderately_sampled",
    "under_sampled",
    "road_trail_biased",
    "park_biased",
    "high_risk_under_sampled",
    "needs_structured_survey",
    "likely_false_absence",
    name="sampling_label",
    create_type=False,
)


def upgrade() -> None:
    sampling_label.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "sampling_grid_cells",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("region_code", sa.String(length=32), nullable=False),
        sa.Column(
            "geom",
            geoalchemy2.Geometry(
                geometry_type="POLYGON",
                srid=4326,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
            ),
            nullable=False,
        ),
        sa.Column("min_latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("min_longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("max_latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("max_longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("observation_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("verified_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("recent_observation_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("distance_to_road_m", sa.Numeric(10, 2), nullable=True),
        sa.Column("distance_to_trail_m", sa.Numeric(10, 2), nullable=True),
        sa.Column("distance_to_park_m", sa.Numeric(10, 2), nullable=True),
        sa.Column(
            "risk_context",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("sampling_label", sampling_label, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sampling_grid_cells")),
    )
    op.create_index(
        op.f("ix_sampling_grid_cells_region_code"),
        "sampling_grid_cells",
        ["region_code"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sampling_grid_cells_sampling_label"),
        "sampling_grid_cells",
        ["sampling_label"],
        unique=False,
    )
    op.create_index(
        "ix_sampling_grid_cells_geom",
        "sampling_grid_cells",
        ["geom"],
        postgresql_using="gist",
    )


def downgrade() -> None:
    op.drop_index("ix_sampling_grid_cells_geom", table_name="sampling_grid_cells")
    op.drop_index(op.f("ix_sampling_grid_cells_sampling_label"), table_name="sampling_grid_cells")
    op.drop_index(op.f("ix_sampling_grid_cells_region_code"), table_name="sampling_grid_cells")
    op.drop_table("sampling_grid_cells")
    sampling_label.drop(op.get_bind(), checkfirst=True)
