"""004 — email verification: is_verified, token hash, expiry

Revision ID: 004
Revises: 003
Create Date: 2026-05-18
"""
from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(128)")
    # Інвалідуємо старі plain-text токени (після переходу на SHA-256)
    op.execute("UPDATE users SET verification_token = NULL WHERE verification_token IS NOT NULL")
    op.execute("ALTER TABLE users ALTER COLUMN verification_token TYPE VARCHAR(64)")
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS verification_token_expires_at")
    op.execute("ALTER TABLE users ALTER COLUMN verification_token TYPE VARCHAR(128)")
