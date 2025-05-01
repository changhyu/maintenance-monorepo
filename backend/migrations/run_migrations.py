#!/usr/bin/env python
"""
마이그레이션 실행 스크립트

이 스크립트는 데이터베이스 마이그레이션을 실행하거나 롤백하는 명령을 제공합니다.
"""

import os
import sys
import importlib
import argparse
from pathlib import Path

# 상위 디렉토리를 파이썬 경로에 추가
parent_dir = str(Path(__file__).parent.parent)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

def list_migration_scripts():
    """
    현재 디렉토리에 있는 모든 마이그레이션 스크립트를 찾습니다.
    """
    current_dir = Path(__file__).parent
    migration_files = []
    
    for file in current_dir.glob("*.py"):
        if file.name.startswith("__") or file.name == Path(__file__).name:
            continue
        
        # .py 확장자 제거
        migration_name = file.stem
        migration_files.append(migration_name)
    
    return sorted(migration_files)

def run_migration(script_name, action):
    """
    지정된 마이그레이션 스크립트의 upgrade 또는 downgrade 함수를 실행합니다.
    
    Args:
        script_name: 마이그레이션 스크립트 이름 (확장자 없음)
        action: 'up' 또는 'down'
    """
    try:
        # 모듈 이름 생성 ("backend.migrations.script_name")
        module_name = f"backend.migrations.{script_name}"
        
        # 모듈 동적 로드
        module = importlib.import_module(module_name)
        
        # 선택한 액션 실행
        if action == "up":
            print(f"마이그레이션 적용 중: {script_name}")
            module.upgrade()
        else:  # down
            print(f"마이그레이션 롤백 중: {script_name}")
            module.downgrade()
            
        print(f"마이그레이션 '{script_name}'이(가) 성공적으로 {action} 되었습니다.")
        
    except Exception as e:
        print(f"마이그레이션 '{script_name}' {action} 중 오류 발생: {str(e)}")
        raise

def main():
    """
    마이그레이션 명령 실행
    """
    parser = argparse.ArgumentParser(description="데이터베이스 마이그레이션 관리 도구")
    parser.add_argument("action", choices=["up", "down", "list"], 
                      help="실행할 마이그레이션 액션: up (적용), down (롤백), list (목록)")
    parser.add_argument("--script", help="실행할 마이그레이션 스크립트 이름 (확장자 제외)")
    
    args = parser.parse_args()
    
    # 마이그레이션 목록 표시
    if args.action == "list":
        migrations = list_migration_scripts()
        if migrations:
            print("사용 가능한 마이그레이션 스크립트:")
            for migration in migrations:
                print(f"  - {migration}")
        else:
            print("마이그레이션 스크립트가 없습니다.")
        return
    
    # 스크립트 이름이 제공되지 않았다면 모든 스크립트 실행
    if args.script:
        scripts = [args.script]
    else:
        scripts = list_migration_scripts()
        
        # 롤백의 경우 역순으로 실행
        if args.action == "down":
            scripts.reverse()
    
    # 마이그레이션 실행
    for script in scripts:
        run_migration(script, args.action)
    
    print("모든 마이그레이션이 성공적으로 완료되었습니다.")

if __name__ == "__main__":
    main()