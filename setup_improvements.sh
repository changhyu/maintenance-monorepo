#!/bin/bash

# 코드 개선 설치 스크립트
# Usage: ./setup_improvements.sh

# 색상 설정
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 스크립트 실행 시 오류 발생하면 중단
set -e

echo -e "${GREEN}차량 유지보수 모노레포 코드 개선 설치를 시작합니다...${NC}"

# 작업 디렉토리 확인
if [ ! -d "packages" ]; then
  echo -e "${RED}오류: 프로젝트 루트 디렉토리에서 스크립트를 실행해주세요.${NC}"
  exit 1
fi

# 백업 디렉토리 생성
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${YELLOW}기존 파일을 $BACKUP_DIR 디렉토리에 백업합니다...${NC}"

# 1. 데이터베이스 연결 확인 스크립트 설치
echo -e "${GREEN}1. 데이터베이스 연결 확인 스크립트 설치 중...${NC}"
if [ -f "packages/api/check_db_connection.sh" ]; then
  cp "packages/api/check_db_connection.sh" "$BACKUP_DIR/"
fi
chmod +x packages/api/check_db_connection.sh
echo -e "${GREEN}✓ 데이터베이스 연결 확인 스크립트가 설치되었습니다.${NC}"
echo -e "${YELLOW}  사용법: cd packages/api && ./check_db_connection.sh${NC}"

# 2. ApiStatusNotification 컴포넌트 설치 확인
echo -e "${GREEN}2. API 상태 알림 컴포넌트 설치 확인 중...${NC}"
if [ -f "packages/frontend/src/components/ApiStatusNotification.tsx" ]; then
  echo -e "${GREEN}✓ API 상태 알림 컴포넌트가 설치되었습니다.${NC}"
  echo -e "${YELLOW}  App.tsx 또는 레이아웃 컴포넌트에 다음 코드를 추가하세요:${NC}"
  echo -e "${YELLOW}  import ApiStatusNotification from './components/ApiStatusNotification';${NC}"
  echo -e "${YELLOW}  // ...${NC}"
  echo -e "${YELLOW}  return (${NC}"
  echo -e "${YELLOW}    <>$(\n)      {/* 기존 코드 */}$(\n)      <ApiStatusNotification />$(\n)    </>$(\n)  );${NC}"
else
  echo -e "${RED}✗ API 상태 알림 컴포넌트 파일이 존재하지 않습니다.${NC}"
fi

# 3. 오프라인 모드 검증 유틸리티 설치
echo -e "${GREEN}3. 오프라인 모드 검증 유틸리티 설치 중...${NC}"
if [ ! -d "packages/api/src/utils" ]; then
  mkdir -p "packages/api/src/utils"
fi

cat > packages/api/src/utils/offline_validator.py << 'EOL'
"""
오프라인 데이터 검증 유틸리티.
"""

import logging
import os
import json
from typing import Dict, List, Any, Optional

from ..core.logging import get_logger
from ..core.offline_manager import offline_manager

logger = get_logger("offline_validator")

def validate_all_offline_data() -> Dict[str, Any]:
    """
    모든 오프라인 데이터를 검증합니다.
    
    Returns:
        Dict[str, Any]: 검증 결과 요약
    """
    logger.info("오프라인 데이터 검증 시작...")
    
    try:
        result = offline_manager.validate_offline_cache()
        
        if result["status"] == "success":
            logger.info(f"모든 오프라인 데이터 검증 완료: {result['valid']}개 정상, {result.get('repaired', 0)}개 복구됨")
        else:
            logger.warning(f"일부 오프라인 데이터 검증 실패: {result.get('failed', 0)}개 실패")
            
        return result
    except Exception as e:
        logger.error(f"오프라인 데이터 검증 중 오류 발생: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

def clean_orphaned_pending_operations() -> Dict[str, Any]:
    """
    고아 상태의 대기 중인 작업을 정리합니다.
    (엔티티가 없는데 대기 중인 작업만 남아있는 경우)
    
    Returns:
        Dict[str, Any]: 정리 결과 요약
    """
    logger.info("고아 상태의 대기 중인 작업 정리 시작...")
    
    try:
        storage_dir = offline_manager.storage_dir
        entity_files = set()
        pending_files = set()
        
        # 파일 목록 조회
        for filename in os.listdir(storage_dir):
            if filename.endswith('.json'):
                if filename.endswith('_pending.json'):
                    # 엔티티 타입 추출
                    entity_type = filename[:-13]  # '_pending.json' 제거
                    pending_files.add(entity_type)
                elif filename != 'offline_status.json':
                    # 일반 엔티티 파일
                    entity_type = filename[:-5]  # '.json' 제거
                    entity_files.add(entity_type)
        
        # 고아 상태 확인
        orphaned = pending_files - entity_files
        
        if not orphaned:
            logger.info("고아 상태의 대기 중인 작업이 없습니다.")
            return {
                "status": "success",
                "message": "No orphaned pending operations found"
            }
        
        # 고아 상태의 파일 정리
        cleaned = []
        for entity_type in orphaned:
            pending_file = os.path.join(storage_dir, f"{entity_type}_pending.json")
            
            # 백업 생성
            if os.path.exists(pending_file):
                backup_file = f"{pending_file}.bak"
                with open(pending_file, 'r') as f_in:
                    with open(backup_file, 'w') as f_out:
                        f_out.write(f_in.read())
                
                # 파일 제거
                os.remove(pending_file)
                cleaned.append(entity_type)
                logger.info(f"고아 상태의 작업 파일 제거: {entity_type} (백업: {backup_file})")
        
        return {
            "status": "success",
            "cleaned": cleaned,
            "count": len(cleaned)
        }
    except Exception as e:
        logger.error(f"고아 상태의 대기 중인 작업 정리 중 오류 발생: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

def get_offline_storage_info() -> Dict[str, Any]:
    """
    오프라인 저장소 정보를 반환합니다.
    
    Returns:
        Dict[str, Any]: 저장소 정보
    """
    try:
        storage_dir = offline_manager.storage_dir
        
        if not os.path.exists(storage_dir):
            return {
                "status": "not_found",
                "message": f"오프라인 저장소 디렉토리가 존재하지 않습니다: {storage_dir}"
            }
        
        # 파일 목록 및 크기 조회
        files = []
        total_size = 0
        
        for filename in os.listdir(storage_dir):
            if filename.endswith('.json'):
                file_path = os.path.join(storage_dir, filename)
                size = os.path.getsize(file_path)
                total_size += size
                
                item = {
                    "name": filename,
                    "size": size,
                    "last_modified": os.path.getmtime(file_path)
                }
                
                # 엔티티 수 확인
                if not (filename.endswith('_pending.json') or filename == 'offline_status.json'):
                    try:
                        with open(file_path, 'r') as f:
                            data = json.load(f)
                            item["entities"] = len(data) if isinstance(data, list) else 0
                    except:
                        item["entities"] = "error"
                
                files.append(item)
        
        return {
            "status": "success",
            "storage_dir": storage_dir,
            "files": files,
            "total_size": total_size,
            "file_count": len(files)
        }
    except Exception as e:
        logger.error(f"오프라인 저장소 정보 조회 중 오류 발생: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    # 스크립트로 직접 실행 시 테스트
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "validate":
            print(json.dumps(validate_all_offline_data(), indent=2))
        elif command == "clean":
            print(json.dumps(clean_orphaned_pending_operations(), indent=2))
        elif command == "info":
            print(json.dumps(get_offline_storage_info(), indent=2))
        else:
            print(f"Unknown command: {command}")
            print("Usage: python -m src.utils.offline_validator [validate|clean|info]")
    else:
        # 기본 명령: 모든 검증 실행
        validate_result = validate_all_offline_data()
        print("Validation result:")
        print(json.dumps(validate_result, indent=2))
        
        clean_result = clean_orphaned_pending_operations()
        print("\nCleanup result:")
        print(json.dumps(clean_result, indent=2))
        
        info_result = get_offline_storage_info()
        print("\nStorage info:")
        print(json.dumps(info_result, indent=2))
EOL

echo -e "${GREEN}✓ 오프라인 모드 검증 유틸리티가 설치되었습니다.${NC}"
echo -e "${YELLOW}  사용법: python -m src.utils.offline_validator [validate|clean|info]${NC}"

# 4. API 건강 상태 확인 엔드포인트 추가
echo -e "${GREEN}4. API 건강 상태 확인 엔드포인트 추가 중...${NC}"

# main.py에 health 엔드포인트가 있는지 확인
if grep -q "@app.get(\"/health\")" "packages/api/src/main.py"; then
  echo -e "${YELLOW}  health 엔드포인트가 이미 존재합니다. 건너뜁니다.${NC}"
else
  # main.py 백업
  cp "packages/api/src/main.py" "$BACKUP_DIR/"
  
  # health 엔드포인트 추가
  # @app.get("/") 다음 줄을 찾아 그 뒤에 health 엔드포인트 추가
  sed -i.bak '/^@app.get("\/")/ a\
\
@app.get("/health")\
def health_check() -> Dict[str, Any]:\
    """API 건강 상태 확인 엔드포인트"""\
    return {\
        "status": "healthy",\
        "timestamp": datetime.now().isoformat(),\
        "version": settings.PROJECT_VERSION\
    }\
' "packages/api/src/main.py"

  echo -e "${GREEN}✓ API 건강 상태 확인 엔드포인트가 추가되었습니다.${NC}"
fi

# 필요한 패키지 확인
echo -e "${GREEN}5. 필요한 패키지 확인 중...${NC}"

# 프론트엔드 패키지 확인
FE_MISSING_PKGS=""
for pkg in '@mui/material' '@mui/icons-material'; do
  if ! grep -q "\"$pkg\"" "packages/frontend/package.json"; then
    FE_MISSING_PKGS="$FE_MISSING_PKGS $pkg"
  fi
done

if [ -n "$FE_MISSING_PKGS" ]; then
  echo -e "${YELLOW}  프론트엔드에 다음 패키지를 설치해야 합니다:${NC}"
  echo -e "${YELLOW}  npm install --save $FE_MISSING_PKGS${NC}"
  echo -e "${YELLOW}  (cd packages/frontend && npm install --save$FE_MISSING_PKGS)${NC}"
fi

# 백엔드 패키지 확인
BE_MISSING_PKGS=""
for pkg in 'fastapi>=0.78.0' 'sqlalchemy>=1.4.0' 'uvicorn>=0.17.6'; do
  if ! grep -q "$pkg" "packages/api/requirements.txt"; then
    BE_MISSING_PKGS="$BE_MISSING_PKGS $pkg"
  fi
done

if [ -n "$BE_MISSING_PKGS" ]; then
  echo -e "${YELLOW}  백엔드에 다음 패키지를 설치해야 합니다:${NC}"
  echo -e "${YELLOW}  pip install $BE_MISSING_PKGS${NC}"
  echo -e "${YELLOW}  (cd packages/api && pip install$BE_MISSING_PKGS)${NC}"
fi

echo -e "${GREEN}코드 개선 설치가 완료되었습니다!${NC}"
echo 
echo -e "${YELLOW}다음 단계를 수행하세요:${NC}"
echo -e "1. ${YELLOW}데이터베이스 연결 확인:${NC} cd packages/api && ./check_db_connection.sh"
echo -e "2. ${YELLOW}오프라인 모드 검증:${NC} cd packages/api && python -m src.utils.offline_validator"
echo -e "3. ${YELLOW}프론트엔드 앱에 API 상태 알림 컴포넌트 추가${NC}"
echo 
echo -e "${GREEN}문제가 발생한 경우 $BACKUP_DIR 디렉토리의 백업 파일을 사용해 복원할 수 있습니다.${NC}" 