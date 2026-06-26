"""create verification events

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-26 00:00:13.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
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
    op.create_table(
        "verification_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("observation_id", sa.UUID(), nullable=False),
        sa.Column("previous_status", verification_status, nullable=False),
        sa.Column("new_status", verification_status, nullable=False),
        sa.Column("reviewer_id", sa.UUID(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["observation_id"],
            ["observations.id"],
            name=op.f("fk_verification_events_observation_id_observations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reviewer_id"],
            ["users.id"],
            name=op.f("fk_verification_events_reviewer_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_verification_events")),
    )
    op.create_index(
        op.f("ix_verification_events_observation_id"),
        "verification_events",
        ["observation_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_verification_events_reviewer_id"),
        "verification_events",
        ["reviewer_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_verification_events_reviewer_id"), table_name="verification_events")
    op.drop_index(op.f("ix_verification_events_observation_id"), table_name="verification_events")
    op.drop_table("verification_events")
