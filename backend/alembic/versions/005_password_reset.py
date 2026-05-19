"""005 — password reset token columns

Revision ID: 005
Revises: 004
Create Date: 2026-05-18
"""
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS password_reset_expires_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS password_reset_token")
