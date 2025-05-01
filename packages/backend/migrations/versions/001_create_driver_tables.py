"""create driver tables

Revision ID: 001
Revises: 
Create Date: 2024-03-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # 드라이버 상태 enum 생성
    op.execute("CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'on_leave')")

    # 드라이버 테이블 생성
    op.create_table(
        'drivers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('license_number', sa.String(), nullable=False),
        sa.Column('status', postgresql.ENUM('active', 'inactive', 'on_leave', name='driver_status'), nullable=False),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('emergency_contact', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('vehicle_id', sa.String(), nullable=True),
        sa.Column('birth_date', sa.DateTime(), nullable=False),
        sa.Column('hire_date', sa.DateTime(), nullable=False),
        sa.Column('license_expiry', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('license_number')
    )

    # 인덱스 생성
    op.create_index(op.f('ix_drivers_id'), 'drivers', ['id'], unique=True)
    op.create_index(op.f('ix_drivers_name'), 'drivers', ['name'], unique=False)
    op.create_index(op.f('ix_drivers_status'), 'drivers', ['status'], unique=False)
    op.create_index(op.f('ix_drivers_vehicle_id'), 'drivers', ['vehicle_id'], unique=False)

    # 문서 테이블 생성
    op.create_table(
        'driver_documents',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('driver_id', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['driver_id'], ['drivers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 인덱스 생성
    op.create_index(op.f('ix_driver_documents_id'), 'driver_documents', ['id'], unique=True)
    op.create_index(op.f('ix_driver_documents_driver_id'), 'driver_documents', ['driver_id'], unique=False)
    op.create_index(op.f('ix_driver_documents_type'), 'driver_documents', ['type'], unique=False)

    # 트리거 생성 - updated_at 자동 업데이트
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)

    op.execute("""
        CREATE TRIGGER update_drivers_updated_at
            BEFORE UPDATE ON drivers
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)

def downgrade():
    # 트리거 삭제
    op.execute("DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")

    # 인덱스 삭제
    op.drop_index(op.f('ix_driver_documents_type'), table_name='driver_documents')
    op.drop_index(op.f('ix_driver_documents_driver_id'), table_name='driver_documents')
    op.drop_index(op.f('ix_driver_documents_id'), table_name='driver_documents')
    op.drop_index(op.f('ix_drivers_vehicle_id'), table_name='drivers')
    op.drop_index(op.f('ix_drivers_status'), table_name='drivers')
    op.drop_index(op.f('ix_drivers_name'), table_name='drivers')
    op.drop_index(op.f('ix_drivers_id'), table_name='drivers')

    # 테이블 삭제
    op.drop_table('driver_documents')
    op.drop_table('drivers')

    # enum 타입 삭제
    op.execute("DROP TYPE driver_status") 