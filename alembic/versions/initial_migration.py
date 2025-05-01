"""initial migration

Revision ID: initial
Revises: 
Create Date: 2024-03-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 정비 유형 enum 생성
    op.execute("""
        CREATE TYPE maintenance_type AS ENUM (
            'oil_change',
            'tire_rotation',
            'brake_service',
            'engine_service',
            'transmission_service',
            'electrical_service',
            'body_service',
            'other'
        )
    """)

    # 정비 상태 enum 생성
    op.execute("""
        CREATE TYPE maintenance_status AS ENUM (
            'pending',
            'in_progress',
            'completed',
            'cancelled',
            'failed'
        )
    """)

    # 정비 우선순위 enum 생성
    op.execute("""
        CREATE TYPE maintenance_priority AS ENUM (
            'low',
            'normal',
            'high',
            'urgent'
        )
    """)

    # 정비 테이블 생성
    op.create_table(
        'maintenances',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('vehicle_id', sa.String(36), nullable=False),
        sa.Column('maintenance_type', postgresql.ENUM(
            'oil_change',
            'tire_rotation',
            'brake_service',
            'engine_service',
            'transmission_service',
            'electrical_service',
            'body_service',
            'other',
            name='maintenance_type'
        ), nullable=False),
        sa.Column('status', postgresql.ENUM(
            'pending',
            'in_progress',
            'completed',
            'cancelled',
            'failed',
            name='maintenance_status'
        ), nullable=False),
        sa.Column('priority', postgresql.ENUM(
            'low',
            'normal',
            'high',
            'urgent',
            name='maintenance_priority'
        ), nullable=False),
        sa.Column('description', sa.String(1000), nullable=False),
        sa.Column('cost', sa.Float, nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('technician_id', sa.String(36), nullable=True),
        sa.Column('parts', sa.JSON, nullable=False, server_default='[]'),
        sa.Column('notes', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'))
    )

def downgrade() -> None:
    # 테이블 삭제
    op.drop_table('maintenances')
    
    # enum 타입 삭제
    op.execute('DROP TYPE maintenance_type')
    op.execute('DROP TYPE maintenance_status')
    op.execute('DROP TYPE maintenance_priority') 