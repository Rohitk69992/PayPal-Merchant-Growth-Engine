"""002_unified_data_acquisition

Revision ID: 7a8b9c0d1e2f
Revises: edbbe21f9457
Create Date: 2026-11-02 22:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, Sequence[str], None] = 'edbbe21f9457'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create data_import_jobs table
    op.create_table(
        'data_import_jobs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('merchant_id', sa.String(length=36), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='COMPLETED'),
        sa.Column('total_rows', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('imported_records', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_records', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('skipped_duplicates', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['merchant_id'], ['merchant_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_data_import_jobs_merchant_id'), 'data_import_jobs', ['merchant_id'], unique=False)

    # 2. Add columns to transactions table
    op.add_column('transactions', sa.Column('external_reference_id', sa.String(length=100), nullable=True))
    op.add_column('transactions', sa.Column('import_job_id', sa.String(length=36), nullable=True))
    op.create_index(op.f('ix_transactions_external_reference_id'), 'transactions', ['external_reference_id'], unique=False)
    op.create_index(op.f('ix_transactions_import_job_id'), 'transactions', ['import_job_id'], unique=False)
    op.create_index('ix_transactions_merchant_date', 'transactions', ['merchant_id', 'transaction_date'], unique=False)
    op.create_index('ix_transactions_merchant_status', 'transactions', ['merchant_id', 'status'], unique=False)
    op.create_foreign_key('fk_transactions_import_job_id', 'transactions', 'data_import_jobs', ['import_job_id'], ['id'], ondelete='SET NULL')

    # 3. Add columns to paypal_connections table
    op.add_column('paypal_connections', sa.Column('merchant_id_in_paypal', sa.String(length=64), nullable=True))
    op.add_column('paypal_connections', sa.Column('partner_referral_id', sa.String(length=100), nullable=True))
    op.add_column('paypal_connections', sa.Column('consent_status', sa.String(length=50), nullable=False, server_default='GRANTED'))


def downgrade() -> None:
    # 3. Remove columns from paypal_connections
    op.drop_column('paypal_connections', 'consent_status')
    op.drop_column('paypal_connections', 'partner_referral_id')
    op.drop_column('paypal_connections', 'merchant_id_in_paypal')

    # 2. Remove columns & indexes from transactions
    op.drop_constraint('fk_transactions_import_job_id', 'transactions', type_='foreignkey')
    op.drop_index('ix_transactions_merchant_status', table_name='transactions')
    op.drop_index('ix_transactions_merchant_date', table_name='transactions')
    op.drop_index(op.f('ix_transactions_import_job_id'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_external_reference_id'), table_name='transactions')
    op.drop_column('transactions', 'import_job_id')
    op.drop_column('transactions', 'external_reference_id')

    # 1. Drop data_import_jobs
    op.drop_index(op.f('ix_data_import_jobs_merchant_id'), table_name='data_import_jobs')
    op.drop_table('data_import_jobs')
