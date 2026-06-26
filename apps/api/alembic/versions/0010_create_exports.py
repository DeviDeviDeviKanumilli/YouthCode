"""create exports

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-26 00:00:09.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

export_format = postgresql.ENUM("csv", "geojson", name="export_format", create_type=False)
export_status = postgresql.ENUM(
    "pending",
    "complete",
    "failed",
    name="export_status",
    create_type=False,
)


def upgrade() -> None:
    export_format.create(op.get_bind(), checkfirst=True)
    export_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "exports",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("requester_id", sa.UUID(), nullable=True),
        sa.Column(
            "filters",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("format", export_format, nullable=False),
        sa.Column("status", export_status, nullable=False, server_default="pending"),
        sa.Column("download_url", sa.String(length=1000), nullable=True),
        sa.Column("license_summary", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["requester_id"],
            ["users.id"],
            name=op.f("fk_exports_requester_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_exports")),
    )
    op.create_index(op.f("ix_exports_requester_id"), "exports", ["requester_id"], unique=False)
    op.create_index(op.f("ix_exports_status"), "exports", ["status"], unique=False)
    op.create_index(op.f("ix_exports_format"), "exports", ["format"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_exports_format"), table_name="exports")
    op.drop_index(op.f("ix_exports_status"), table_name="exports")
    op.drop_index(op.f("ix_exports_requester_id"), table_name="exports")
    op.drop_table("exports")
    export_status.drop(op.get_bind(), checkfirst=True)
    export_format.drop(op.get_bind(), checkfirst=True)
