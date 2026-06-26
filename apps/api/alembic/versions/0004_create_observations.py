"""create observations

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-26 00:00:03.000000
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

observation_source = postgresql.ENUM(
    "consumer_app",
    "research_dashboard",
    "import",
    "demo_seed",
    name="observation_source",
    create_type=False,
)

privacy_level = postgresql.ENUM(
    "public",
    "obscured",
    "private",
    name="privacy_level",
    create_type=False,
)


def upgrade() -> None:
    observation_source.create(op.get_bind(), checkfirst=True)
    privacy_level.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "observations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("coordinate_uncertainty_m", sa.Numeric(10, 2), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.Geometry(
                geometry_type="POINT",
                srid=4326,
                spatial_index=True,
                from_text="ST_GeomFromEWKT",
                name="geometry",
            ),
            nullable=False,
        ),
        sa.Column("region_code", sa.String(length=32), nullable=True),
        sa.Column(
            "source",
            observation_source,
            nullable=False,
            server_default="consumer_app",
        ),
        sa.Column("raw_note", sa.Text(), nullable=True),
        sa.Column(
            "habitat_answers",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("survey_session_id", sa.UUID(), nullable=True),
        sa.Column(
            "privacy_level",
            privacy_level,
            nullable=False,
            server_default="public",
        ),
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
            ["user_id"],
            ["users.id"],
            name=op.f("fk_observations_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_observations")),
    )
    op.create_index(op.f("ix_observations_timestamp"), "observations", ["timestamp"], unique=False)
    op.create_index(
        op.f("ix_observations_region_code"),
        "observations",
        ["region_code"],
        unique=False,
    )
    op.create_index(op.f("ix_observations_source"), "observations", ["source"], unique=False)
    op.create_index(
        op.f("ix_observations_privacy_level"),
        "observations",
        ["privacy_level"],
        unique=False,
    )
    op.create_check_constraint(
        "ck_observations_latitude_range",
        "observations",
        "latitude >= -90 AND latitude <= 90",
    )
    op.create_check_constraint(
        "ck_observations_longitude_range",
        "observations",
        "longitude >= -180 AND longitude <= 180",
    )
    op.execute(
        """
        CREATE TRIGGER observations_set_geom
        BEFORE INSERT OR UPDATE OF latitude, longitude ON observations
        FOR EACH ROW
        EXECUTE FUNCTION update_geometry_from_latlon()
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS observations_set_geom ON observations")
    op.drop_constraint("ck_observations_longitude_range", "observations", type_="check")
    op.drop_constraint("ck_observations_latitude_range", "observations", type_="check")
    op.drop_index(op.f("ix_observations_privacy_level"), table_name="observations")
    op.drop_index(op.f("ix_observations_source"), table_name="observations")
    op.drop_index(op.f("ix_observations_region_code"), table_name="observations")
    op.drop_index(op.f("ix_observations_timestamp"), table_name="observations")
    op.drop_table("observations")
    privacy_level.drop(op.get_bind(), checkfirst=True)
    observation_source.drop(op.get_bind(), checkfirst=True)
