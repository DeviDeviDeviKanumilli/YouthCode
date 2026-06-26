"""create signal scores

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-26 00:00:07.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

signal_score_label = postgresql.ENUM(
    "low_signal",
    "moderate_signal",
    "high_value_verification_candidate",
    "priority_ecological_signal",
    "insufficient_evidence",
    name="signal_score_label",
    create_type=False,
)


def upgrade() -> None:
    signal_score_label.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "signal_scores",
        sa.Column("observation_id", sa.UUID(), nullable=False),
        sa.Column("identity_confidence", sa.Numeric(5, 2), nullable=False),
        sa.Column("local_novelty", sa.Numeric(5, 2), nullable=False),
        sa.Column("habitat_match", sa.Numeric(5, 2), nullable=False),
        sa.Column("pathway_risk", sa.Numeric(5, 2), nullable=False),
        sa.Column("nearby_verified_record_context", sa.Numeric(5, 2), nullable=False),
        sa.Column("ecological_sensitivity", sa.Numeric(5, 2), nullable=False),
        sa.Column("sampling_gap_value", sa.Numeric(5, 2), nullable=False),
        sa.Column("temporal_cluster_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("uncertainty_penalty", sa.Numeric(5, 2), nullable=False),
        sa.Column("final_signal_priority", sa.Numeric(5, 2), nullable=False),
        sa.Column("label", signal_score_label, nullable=False),
        sa.Column(
            "reasons",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("model_version", sa.String(length=120), nullable=False),
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
            name=op.f("fk_signal_scores_observation_id_observations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("observation_id", name=op.f("pk_signal_scores")),
    )


def downgrade() -> None:
    op.drop_table("signal_scores")
    signal_score_label.drop(op.get_bind(), checkfirst=True)
