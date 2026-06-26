"""create observation pipeline runs

Revision ID: 0016
Revises: 0015
Create Date: 2026-06-26 00:00:15.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0016"
down_revision: str | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

pipeline_run_status = postgresql.ENUM(
    "pending",
    "running",
    "complete",
    "failed",
    name="pipeline_run_status",
    create_type=False,
)


def upgrade() -> None:
    pipeline_run_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "observation_pipeline_runs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("observation_id", sa.UUID(), nullable=False),
        sa.Column("status", pipeline_run_status, nullable=False, server_default="pending"),
        sa.Column(
            "steps",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["observation_id"],
            ["observations.id"],
            name=op.f("fk_observation_pipeline_runs_observation_id_observations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_observation_pipeline_runs")),
    )
    op.create_index(
        op.f("ix_observation_pipeline_runs_observation_id"),
        "observation_pipeline_runs",
        ["observation_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_observation_pipeline_runs_status"),
        "observation_pipeline_runs",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_observation_pipeline_runs_status"),
        table_name="observation_pipeline_runs",
    )
    op.drop_index(
        op.f("ix_observation_pipeline_runs_observation_id"),
        table_name="observation_pipeline_runs",
    )
    op.drop_table("observation_pipeline_runs")
    pipeline_run_status.drop(op.get_bind(), checkfirst=True)
