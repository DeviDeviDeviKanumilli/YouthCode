"""create media

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-26 00:00:04.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

media_file_type = postgresql.ENUM(
    "image",
    "audio",
    "video",
    "other",
    name="media_file_type",
    create_type=False,
)


def upgrade() -> None:
    media_file_type.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "media",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("observation_id", sa.UUID(), nullable=False),
        sa.Column("file_type", media_file_type, nullable=False),
        sa.Column("mime_type", sa.String(length=120), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("public_url", sa.String(length=1000), nullable=True),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("quality_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("metadata_removed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["observation_id"],
            ["observations.id"],
            name=op.f("fk_media_observation_id_observations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_media")),
    )
    op.create_index(op.f("ix_media_observation_id"), "media", ["observation_id"], unique=False)
    op.create_index(op.f("ix_media_file_type"), "media", ["file_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_media_file_type"), table_name="media")
    op.drop_index(op.f("ix_media_observation_id"), table_name="media")
    op.drop_table("media")
    media_file_type.drop(op.get_bind(), checkfirst=True)
