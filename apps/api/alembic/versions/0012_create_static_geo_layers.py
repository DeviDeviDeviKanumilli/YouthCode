"""create static geo layers

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-26 00:00:11.000000
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

road_trail_type = postgresql.ENUM("road", "trail", name="road_trail_type", create_type=False)
verification_status = postgresql.ENUM(
    "raw",
    "ai_suggested",
    "community_supported",
    "expert_verified",
    "rejected",
    "needs_more_evidence",
    "field_confirmed",
    name="verification_status",
    create_type=False,
)


def upgrade() -> None:
    road_trail_type.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "waterways",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.Geometry(
                geometry_type="MULTILINESTRING",
                srid=4326,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
            ),
            nullable=False,
        ),
        sa.Column("representative_latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("representative_longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_waterways")),
    )
    op.create_table(
        "roads_trails",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("type", road_trail_type, nullable=False),
        sa.Column(
            "geom",
            geoalchemy2.Geometry(
                geometry_type="MULTILINESTRING",
                srid=4326,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
            ),
            nullable=False,
        ),
        sa.Column("representative_latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("representative_longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_roads_trails")),
    )
    op.create_table(
        "parks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "geom",
            geoalchemy2.Geometry(
                geometry_type="MULTIPOLYGON",
                srid=4326,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
            ),
            nullable=False,
        ),
        sa.Column("representative_latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("representative_longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_parks")),
    )
    op.create_table(
        "known_records",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("species_id", sa.UUID(), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verification_status", verification_status, nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column(
            "geom",
            geoalchemy2.Geometry(
                geometry_type="POINT",
                srid=4326,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
            ),
            nullable=False,
        ),
        sa.Column("latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["species_id"],
            ["species.id"],
            name=op.f("fk_known_records_species_id_species"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_known_records")),
    )
    op.create_index("ix_waterways_geom", "waterways", ["geom"], postgresql_using="gist")
    op.create_index("ix_roads_trails_geom", "roads_trails", ["geom"], postgresql_using="gist")
    op.create_index("ix_parks_geom", "parks", ["geom"], postgresql_using="gist")
    op.create_index("ix_known_records_geom", "known_records", ["geom"], postgresql_using="gist")
    op.create_index(op.f("ix_roads_trails_type"), "roads_trails", ["type"], unique=False)
    op.create_index(
        op.f("ix_known_records_species_id"),
        "known_records",
        ["species_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_known_records_observed_at"),
        "known_records",
        ["observed_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_known_records_verification_status"),
        "known_records",
        ["verification_status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_known_records_verification_status"), table_name="known_records")
    op.drop_index(op.f("ix_known_records_observed_at"), table_name="known_records")
    op.drop_index(op.f("ix_known_records_species_id"), table_name="known_records")
    op.drop_index(op.f("ix_roads_trails_type"), table_name="roads_trails")
    op.drop_index("ix_known_records_geom", table_name="known_records")
    op.drop_index("ix_parks_geom", table_name="parks")
    op.drop_index("ix_roads_trails_geom", table_name="roads_trails")
    op.drop_index("ix_waterways_geom", table_name="waterways")
    op.drop_table("known_records")
    op.drop_table("parks")
    op.drop_table("roads_trails")
    op.drop_table("waterways")
    road_trail_type.drop(op.get_bind(), checkfirst=True)
