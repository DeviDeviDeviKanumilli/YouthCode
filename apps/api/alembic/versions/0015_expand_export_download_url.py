"""expand export download url

Revision ID: 0015
Revises: 0014
Create Date: 2026-06-26 00:00:14.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "exports",
        "download_url",
        existing_type=sa.String(length=1000),
        type_=sa.Text(),
    )


def downgrade() -> None:
    op.alter_column(
        "exports",
        "download_url",
        existing_type=sa.Text(),
        type_=sa.String(length=1000),
    )
