"""enable postgis

Revision ID: 0001
Revises:
Create Date: 2026-06-26 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_geometry_from_latlon()
        RETURNS trigger AS $$
        BEGIN
            NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """
    )


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS update_geometry_from_latlon()")
    op.execute("DROP EXTENSION IF EXISTS postgis")
