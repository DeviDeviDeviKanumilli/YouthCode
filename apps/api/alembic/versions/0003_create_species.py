"""create species

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-26 00:00:02.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "species",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("scientific_name", sa.String(length=255), nullable=False),
        sa.Column("common_name", sa.String(length=255), nullable=True),
        sa.Column(
            "common_names",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("gbif_taxon_id", sa.Integer(), nullable=True),
        sa.Column("inat_taxon_id", sa.Integer(), nullable=True),
        sa.Column("nas_id", sa.String(length=80), nullable=True),
        sa.Column("kingdom", sa.String(length=80), nullable=True),
        sa.Column("taxon_rank", sa.String(length=80), nullable=True),
        sa.Column(
            "native_status_by_state",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "invasive_status_by_state",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "synonyms",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_species")),
        sa.UniqueConstraint("scientific_name", name=op.f("uq_species_scientific_name")),
    )
    op.create_index(op.f("ix_species_common_name"), "species", ["common_name"], unique=False)
    op.create_index(op.f("ix_species_gbif_taxon_id"), "species", ["gbif_taxon_id"], unique=False)
    op.create_index(op.f("ix_species_inat_taxon_id"), "species", ["inat_taxon_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_species_inat_taxon_id"), table_name="species")
    op.drop_index(op.f("ix_species_gbif_taxon_id"), table_name="species")
    op.drop_index(op.f("ix_species_common_name"), table_name="species")
    op.drop_table("species")
