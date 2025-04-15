-- 데이터베이스 생성
CREATE DATABASE maintenance;

-- 읽기 전용 사용자 생성
CREATE USER readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE maintenance TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;

-- 애플리케이션 사용자 생성
CREATE USER maintenance_app WITH PASSWORD 'app_password';
GRANT CONNECT ON DATABASE maintenance TO maintenance_app;
GRANT USAGE ON SCHEMA public TO maintenance_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO maintenance_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO maintenance_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO maintenance_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO maintenance_app;

-- 확장 모듈 설치
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_created_at ON maintenance_logs USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS idx_vehicle_search ON vehicles USING GiST (make, model, year);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records USING BTREE (status);

-- 감사 로깅을 위한 테이블 생성
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 감사 로깅을 위한 트리거 함수
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME::TEXT, 'DELETE', row_to_json(OLD), current_user);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME::TEXT, 'UPDATE', row_to_json(OLD), row_to_json(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME::TEXT, 'INSERT', row_to_json(NEW), current_user);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql; 