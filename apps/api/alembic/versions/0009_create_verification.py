"""create verification

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-26 00:00:08.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

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
    verification_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "verification",
        sa.Column("observation_id", sa.UUID(), nullable=False),
        sa.Column("status", verification_status, nullable=False, server_default="raw"),
        sa.Column("reviewer_id", sa.UUID(), nullable=True),
        sa.Column("reviewer_type", sa.String(length=120), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("verified_species_id", sa.UUID(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
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
            name=op.f("fk_verification_observation_id_observations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reviewer_id"],
            ["users.id"],
            name=op.f("fk_verification_reviewer_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["verified_species_id"],
            ["species.id"],
            name=op.f("fk_verification_verified_species_id_species"),
        ),
        sa.PrimaryKeyConstraint("observation_id", name=op.f("pk_verification")),
    )
    op.create_index(op.f("ix_verification_status"), "verification", ["status"], unique=False)
    op.create_index(
        op.f("ix_verification_reviewer_id"),
        "verification",
        ["reviewer_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_verification_reviewer_id"), table_name="verification")
    op.drop_index(op.f("ix_verification_status"), table_name="verification")
    op.drop_table("verification")
    verification_status.drop(op.get_bind(), checkfirst=True)
