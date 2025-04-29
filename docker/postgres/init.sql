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

-- 자주 사용되는 조회에 대한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records USING HASH (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_records USING BRIN (maintenance_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_owner_id ON vehicles USING HASH (owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_vin ON vehicles USING HASH (vin);
CREATE INDEX IF NOT EXISTS idx_vehicle_reg_number ON vehicles USING HASH (registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_stats_multidim ON vehicles USING BTREE (status, type, make);

-- 데이터베이스 성능 최적화 설정
ALTER SYSTEM SET shared_buffers = '256MB';                -- 서버 메모리의 25%
ALTER SYSTEM SET effective_cache_size = '768MB';          -- 서버 메모리의 75%
ALTER SYSTEM SET maintenance_work_mem = '64MB';           -- 인덱스 생성 등에 사용할 메모리
ALTER SYSTEM SET work_mem = '4MB';                        -- 쿼리 처리에 사용할 메모리
ALTER SYSTEM SET random_page_cost = 1.1;                  -- SSD 사용 시
ALTER SYSTEM SET max_connections = 100;                   -- 최대 연결 수
ALTER SYSTEM SET checkpoint_timeout = '10min';            -- 체크포인트 주기
ALTER SYSTEM SET checkpoint_completion_target = 0.9;      -- 체크포인트 작업 분산
ALTER SYSTEM SET wal_buffers = '16MB';                    -- WAL 버퍼 크기
ALTER SYSTEM SET synchronous_commit = 'off';              -- 트랜잭션 성능 향상

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

-- 자주 사용되는 쿼리에 대한 프리페어드 스테이트먼트 설정
PREPARE vehicle_by_id(uuid) AS
    SELECT * FROM vehicles WHERE id = $1;

PREPARE maintenance_by_vehicle(uuid) AS
    SELECT * FROM maintenance_records WHERE vehicle_id = $1 ORDER BY maintenance_date DESC;

PREPARE recent_maintenance(int) AS
    SELECT * FROM maintenance_records 
    ORDER BY maintenance_date DESC 
    LIMIT $1;