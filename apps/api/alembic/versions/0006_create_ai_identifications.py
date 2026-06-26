"""create ai identifications

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-26 00:00:05.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

confidence_label = postgresql.ENUM(
    "low",
    "medium",
    "medium_high",
    "high",
    name="confidence_label",
    create_type=False,
)


def upgrade() -> None:
    confidence_label.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "ai_identifications",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("observation_id", sa.UUID(), nullable=False),
        sa.Column("candidate_species_id", sa.UUID(), nullable=True),
        sa.Column("candidate_scientific_name", sa.String(length=255), nullable=False),
        sa.Column("candidate_common_name", sa.String(length=255), nullable=True),
        sa.Column("confidence", sa.Numeric(5, 4), nullable=False),
        sa.Column("confidence_label", confidence_label, nullable=False),
        sa.Column("model_name", sa.String(length=120), nullable=False),
        sa.Column("model_version", sa.String(length=120), nullable=False),
        sa.Column(
            "similar_species",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "raw_model_output",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("needs_verification", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["candidate_species_id"],
            ["species.id"],
            name=op.f("fk_ai_identifications_candidate_species_id_species"),
        ),
        sa.ForeignKeyConstraint(
            ["observation_id"],
            ["observations.id"],
            name=op.f("fk_ai_identifications_observation_id_observations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_identifications")),
    )
    op.create_index(
        op.f("ix_ai_identifications_observation_id"),
        "ai_identifications",
        ["observation_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ai_identifications_candidate_species_id"),
        "ai_identifications",
        ["candidate_species_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_ai_identifications_candidate_species_id"),
        table_name="ai_identifications",
    )
    op.drop_index(op.f("ix_ai_identifications_observation_id"), table_name="ai_identifications")
    op.drop_table("ai_identifications")
    confidence_label.drop(op.get_bind(), checkfirst=True)
