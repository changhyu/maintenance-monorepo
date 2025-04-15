#!/bin/bash

# 데이터베이스 연결 확인 스크립트
# 실행 권한: chmod +x check_db_connection.sh

# 스크립트 실행 시 오류 발생하면 중단
set -e

echo "데이터베이스 연결 설정 확인 중..."

# 프로젝트 루트 디렉토리에서 .db_config 파일 확인
if [ -f "../../.db_config" ]; then
    echo "프로젝트 루트의 .db_config 파일에서 설정을 로드합니다."
    source ../../.db_config
elif [ -f "../.db_config" ]; then
    echo "상위 디렉토리의 .db_config 파일에서 설정을 로드합니다."
    source ../.db_config
elif [ -f ".db_config" ]; then
    echo "현재 디렉토리의 .db_config 파일에서 설정을 로드합니다."
    source .db_config
fi

# 환경 변수 파일 확인
if [ -f ".env" ]; then
    echo ".env 파일에서 환경 변수를 로드합니다."
    # .env 파일 파싱
    export $(grep -v '^#' .env | xargs)
fi

# 환경 변수에서 데이터베이스 URL 가져오기
if [ -n "$DATABASE_URL" ]; then
    echo "환경 변수에서 DATABASE_URL을 찾았습니다: $DATABASE_URL"
    
    # DATABASE_URL 파싱
    DB_TYPE=$(echo $DATABASE_URL | cut -d':' -f1)
    
    if [ "$DB_TYPE" = "postgresql" ]; then
        # postgresql://user:password@host:port/dbname
        DB_USER=$(echo $DATABASE_URL | cut -d':' -f2 | cut -d'/' -f3 | cut -d'@' -f1)
        DB_PASSWORD=$(echo $DATABASE_URL | cut -d':' -f3 | cut -d'@' -f1)
        DB_HOST=$(echo $DATABASE_URL | cut -d'@' -f2 | cut -d':' -f1)
        DB_PORT=$(echo $DATABASE_URL | cut -d':' -f4 | cut -d'/' -f1)
        DB_NAME=$(echo $DATABASE_URL | cut -d'/' -f4 | cut -d'?' -f1)
    else
        echo "지원되지 않는, 또는 알 수 없는 데이터베이스 유형: $DB_TYPE"
        echo "현재는 PostgreSQL 형식의 연결 문자열만 지원합니다."
        exit 1
    fi
else
    # .db_config 파일에서 개별 변수 사용
    if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
        echo "데이터베이스 연결 정보가 없습니다."
        echo "DATABASE_URL 환경 변수 또는 .db_config 파일 설정이 필요합니다."
        exit 1
    fi
fi

echo "데이터베이스 연결 정보:"
echo "호스트: $DB_HOST"
echo "포트: $DB_PORT"
echo "데이터베이스: $DB_NAME"
echo "사용자: $DB_USER"
echo "비밀번호: [보안을 위해 표시하지 않음]"

# PostgreSQL 클라이언트 확인
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL 클라이언트(psql)가 설치되어 있지 않습니다."
    echo "연결 테스트를 건너뜁니다."
    echo "PostgreSQL 클라이언트 설치 방법:"
    echo "  - Debian/Ubuntu: sudo apt-get install postgresql-client"
    echo "  - RHEL/CentOS: sudo yum install postgresql"
    echo "  - macOS: brew install postgresql"
    exit 0
fi

# 데이터베이스 연결 테스트
echo -n "데이터베이스 연결 테스트 중... "

if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" &> /dev/null; then
    echo "성공!"
    echo "데이터베이스 연결이 정상적으로 설정되었습니다."
else
    echo "실패!"
    echo "데이터베이스 연결에 실패했습니다. 다음 사항을 확인하세요:"
    echo "1. 데이터베이스 서버가 실행 중인지 확인"
    echo "2. 데이터베이스 이름, 사용자 및 비밀번호가 올바른지 확인"
    echo "3. 방화벽 설정 확인"
    echo "4. PostgreSQL 서버 로그 확인"
    
    # 추가 진단
    echo ""
    echo "추가 진단 정보:"
    
    # 호스트 연결 가능 여부 확인
    echo -n "호스트 연결 가능 여부 확인: "
    if ping -c 1 $DB_HOST &> /dev/null; then
        echo "성공"
    else
        echo "실패 - 호스트 $DB_HOST에 연결할 수 없습니다."
    fi
    
    # 포트 열려있는지 확인
    echo -n "포트 연결 가능 여부 확인: "
    if nc -z $DB_HOST $DB_PORT &> /dev/null; then
        echo "성공"
    else
        echo "실패 - $DB_HOST의 $DB_PORT 포트가 열려있지 않습니다."
    fi
    
    exit 1
fi

# 테이블 목록 조회
echo ""
echo "데이터베이스 테이블 목록 조회:"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt" 2>/dev/null || echo "테이블 목록을 조회할 수 없습니다."

echo ""
echo "데이터베이스 연결 확인이 완료되었습니다." 