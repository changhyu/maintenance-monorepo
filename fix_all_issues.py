#!/usr/bin/env python3
"""
모든 중요 오류 해결 스크립트
"""

import os
import sys
import re
import json
import shutil

def ensure_directory(directory):
    """디렉토리가 존재하는지 확인하고 없으면 생성"""
    if not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)
        print(f"✓ {directory} 디렉토리 생성 완료")

def fix_dependencies():
    """dependencies.py 파일 수정"""
    dependency_path = os.path.join("packages", "api", "src", "core", "dependencies.py")
    try:
        with open(dependency_path, "r", encoding="utf-8") as file:
            content = file.read()
        
        # get_db 함수 수정
        pattern = r"db = None\s+#\s+임시 구현.+"
        replacement = "from ..database import SessionLocal\n    db = SessionLocal()"
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        
        # if db: 조건 제거
        new_content = new_content.replace("if db:", "")
        
        with open(dependency_path, "w", encoding="utf-8") as file:
            file.write(new_content)
        
        print(f"✓ {dependency_path} 파일 수정 완료")
        return True
    except Exception as e:
        print(f"× {dependency_path} 파일 수정 실패: {e}")
        return False

def fix_offline_manager():
    """오프라인 매니저 경로 설정"""
    offline_manager_path = os.path.join("packages", "api", "src", "core", "offline_manager.py")
    try:
        with open(offline_manager_path, "r", encoding="utf-8") as file:
            content = file.read()
        
        # 오프라인 매니저 인스턴스 경로 수정
        pattern = r"_instance = None"
        storage_dir = "./offline_storage"
        replacement = f'_instance = None\n    _default_storage_dir = "{storage_dir}"'
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        
        # 오프라인 저장소 디렉토리 생성
        offline_storage_dir = os.path.join("packages", "api", storage_dir)
        ensure_directory(offline_storage_dir)
        
        with open(offline_manager_path, "w", encoding="utf-8") as file:
            file.write(new_content)
        
        print(f"✓ {offline_manager_path} 파일 수정 완료")
        return True
    except Exception as e:
        print(f"× {offline_manager_path} 파일 수정 실패: {e}")
        return False

def create_init_file(directory):
    """__init__.py 파일 생성"""
    init_path = os.path.join(directory, "__init__.py")
    if not os.path.exists(init_path):
        with open(init_path, "w", encoding="utf-8") as file:
            file.write('"""Module initialization."""\n')
        print(f"✓ {init_path} 파일 생성 완료")

def ensure_module_imports():
    """모듈 임포트 오류 해결을 위한 __init__.py 파일 생성"""
    api_src = os.path.join("packages", "api", "src")
    modules_dir = os.path.join(api_src, "modules")
    
    # 모듈 디렉토리 경로
    module_dirs = [
        os.path.join(modules_dir, "todo"),
        os.path.join(modules_dir, "maintenance"),
        os.path.join(modules_dir, "shop"),
        os.path.join(modules_dir, "vehicle"),
    ]
    
    for directory in module_dirs:
        ensure_directory(directory)
        create_init_file(directory)
    
    # src/modules/__init__.py 파일 수정
    modules_init = os.path.join(modules_dir, "__init__.py")
    with open(modules_init, "w", encoding="utf-8") as file:
        file.write('"""API 모듈 패키지."""\n\n')
        file.write('from . import todo\n')
        file.write('from . import maintenance\n')
        file.write('from . import shop\n')
        file.write('from . import vehicle\n')
    
    print(f"✓ 모듈 임포트 구조 수정 완료")
    return True

def fix_environment_vars():
    """환경 변수 설정 파일 수정"""
    api_env_path = os.path.join("packages", "api", ".env")
    try:
        # .db_config 파일 읽기
        db_config_path = os.path.join(".db_config")
        db_config = {}
        if os.path.exists(db_config_path):
            with open(db_config_path, "r", encoding="utf-8") as file:
                for line in file:
                    if "=" in line:
                        key, value = line.strip().split("=", 1)
                        db_config[key] = value
        
        # 환경 변수 설정
        env_vars = {
            "DEBUG": "true",
            "ENVIRONMENT": "development",
            "HOST": "0.0.0.0",
            "PORT": "8000",
        }
        
        # 데이터베이스 URL 생성
        if db_config:
            db_url = f"postgresql://{db_config.get('DB_USER', 'postgres')}:{db_config.get('DB_PASSWORD', 'postgres')}@{db_config.get('DB_HOST', 'localhost')}:{db_config.get('DB_PORT', '5432')}/{db_config.get('DB_NAME', 'maintenance')}"
            env_vars["DATABASE_URL"] = db_url
        
        # 환경 변수 파일 생성
        with open(api_env_path, "w", encoding="utf-8") as file:
            for key, value in env_vars.items():
                file.write(f"{key}={value}\n")
        
        print(f"✓ {api_env_path} 환경 변수 파일 수정 완료")
        return True
    except Exception as e:
        print(f"× 환경 변수 설정 파일 수정 실패: {e}")
        return False

def main():
    """모든 수정 작업 실행"""
    print("중요 오류 해결 시작...")
    
    success = fix_dependencies()
    if not success:
        return False
    
    success = fix_offline_manager()
    if not success:
        return False
    
    success = ensure_module_imports()
    if not success:
        return False
    
    success = fix_environment_vars()
    if not success:
        return False
    
    print("\n모든 중요 오류 수정 완료!")
    print("\n프로젝트를 시작하려면:")
    print("1. npm run dev:api - API 서버 실행")
    print("2. npm run dev:frontend - 프론트엔드 서버 실행")
    print("3. npm run dev:all - 모든 서버 함께 실행")
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        print("오류가 발생했습니다.")
        sys.exit(1) 