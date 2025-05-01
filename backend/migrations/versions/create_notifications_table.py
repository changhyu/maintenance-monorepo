"""create notifications table

Revision ID: 001
Revises: 
Create Date: 2024-04-29 15:00:00.000000

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
    # 알림 유형 enum 생성
    notification_type = postgresql.ENUM('in_app', 'email', 'sms', 'push', 'system', name='notification_type')
    notification_type.create(op.get_bind())
    
    # 알림 우선순위 enum 생성
    notification_priority = postgresql.ENUM('low', 'normal', 'high', 'urgent', name='notification_priority')
    notification_priority.create(op.get_bind())
    
    # 알림 테이블 생성
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.String(1000), nullable=False),
        sa.Column('notification_type', notification_type, nullable=False),
        sa.Column('recipients', sa.JSON, nullable=False),
        sa.Column('priority', notification_priority, nullable=False, server_default='normal'),
        sa.Column('metadata', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('user_id', sa.String(36), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )
    
    # 인덱스 생성
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_read_at', 'notifications', ['read_at'])

def downgrade():
    # 테이블 삭제
    op.drop_table('notifications')
    
    # enum 삭제
    notification_type = postgresql.ENUM(name='notification_type')
    notification_type.drop(op.get_bind())
    
    notification_priority = postgresql.ENUM(name='notification_priority')
    notification_priority.drop(op.get_bind()) 