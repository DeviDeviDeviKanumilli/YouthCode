"""create watch screen tables

Revision ID: 0017
Revises: 0016
Create Date: 2026-06-26 00:00:16.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def jsonb() -> postgresql.JSONB:
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "species_watch_profiles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("species_id", sa.UUID(), nullable=False),
        sa.Column("region_code", sa.String(length=32), nullable=True),
        sa.Column("state_code", sa.String(length=8), nullable=True),
        sa.Column("watch_label", sa.String(length=120), nullable=False),
        sa.Column("public_summary", sa.Text(), nullable=False),
        sa.Column("active_months", jsonb(), nullable=False, server_default="[]"),
        sa.Column("habitat_tags", jsonb(), nullable=False, server_default="[]"),
        sa.Column("pathway_tags", jsonb(), nullable=False, server_default="[]"),
        sa.Column("visual_clues", jsonb(), nullable=False, server_default="[]"),
        sa.Column("photo_tips", jsonb(), nullable=False, server_default="[]"),
        sa.Column("lookalike_notes", jsonb(), nullable=False, server_default="[]"),
        sa.Column("priority_base", sa.Numeric(5, 2), nullable=False, server_default="50"),
        sa.Column("is_invasive_concern", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_seasonal", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_tree_pest", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_aquatic", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["species_id"],
            ["species.id"],
            name=op.f("fk_species_watch_profiles_species_id_species"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_species_watch_profiles")),
    )
    op.create_index(
        op.f("ix_species_watch_profiles_species_id"),
        "species_watch_profiles",
        ["species_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_species_watch_profiles_region_code"),
        "species_watch_profiles",
        ["region_code"],
        unique=False,
    )
    op.create_index(
        op.f("ix_species_watch_profiles_state_code"),
        "species_watch_profiles",
        ["state_code"],
        unique=False,
    )

    op.create_table(
        "watch_asset_images",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("entity_type", sa.String(length=40), nullable=False),
        sa.Column("entity_id", sa.UUID(), nullable=True),
        sa.Column("place_type", sa.String(length=80), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("alt_text", sa.String(length=255), nullable=False),
        sa.Column("credit", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_watch_asset_images")),
    )
    op.create_index(
        op.f("ix_watch_asset_images_entity_type"),
        "watch_asset_images",
        ["entity_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_watch_asset_images_entity_id"),
        "watch_asset_images",
        ["entity_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_watch_asset_images_place_type"),
        "watch_asset_images",
        ["place_type"],
        unique=False,
    )

    op.create_table(
        "watch_response_cache",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("cache_key", sa.String(length=255), nullable=False),
        sa.Column("lat_bucket", sa.Numeric(9, 4), nullable=False),
        sa.Column("lon_bucket", sa.Numeric(9, 4), nullable=False),
        sa.Column("radius_km", sa.Numeric(5, 2), nullable=False),
        sa.Column("response_json", jsonb(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_watch_response_cache")),
    )
    op.create_index(
        op.f("ix_watch_response_cache_cache_key"),
        "watch_response_cache",
        ["cache_key"],
        unique=True,
    )
    op.create_index(
        op.f("ix_watch_response_cache_expires_at"),
        "watch_response_cache",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_watch_response_cache_expires_at"), table_name="watch_response_cache")
    op.drop_index(op.f("ix_watch_response_cache_cache_key"), table_name="watch_response_cache")
    op.drop_table("watch_response_cache")
    op.drop_index(op.f("ix_watch_asset_images_place_type"), table_name="watch_asset_images")
    op.drop_index(op.f("ix_watch_asset_images_entity_id"), table_name="watch_asset_images")
    op.drop_index(op.f("ix_watch_asset_images_entity_type"), table_name="watch_asset_images")
    op.drop_table("watch_asset_images")
    op.drop_index(op.f("ix_species_watch_profiles_state_code"), table_name="species_watch_profiles")
    op.drop_index(
        op.f("ix_species_watch_profiles_region_code"),
        table_name="species_watch_profiles",
    )
    op.drop_index(
        op.f("ix_species_watch_profiles_species_id"),
        table_name="species_watch_profiles",
    )
    op.drop_table("species_watch_profiles")
