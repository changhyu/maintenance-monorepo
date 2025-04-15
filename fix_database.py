#!/usr/bin/env python3
"""
데이터베이스 연결 문제 해결 스크립트
"""

import os
import sys
import re

# 파일 경로
DEPENDENCIES_PATH = os.path.join("packages", "api", "src", "core", "dependencies.py")

def fix_dependencies():
    """dependencies.py 파일 수정"""
    try:
        with open(DEPENDENCIES_PATH, "r", encoding="utf-8") as file:
            content = file.read()
        
        # get_db 함수 수정
        pattern = r"db = None\s+#\s+임시 구현.+"
        replacement = "from ..database import SessionLocal\n    db = SessionLocal()"
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        
        # if db: 조건 제거
        new_content = new_content.replace("if db:", "")
        
        with open(DEPENDENCIES_PATH, "w", encoding="utf-8") as file:
            file.write(new_content)
        
        print(f"✓ {DEPENDENCIES_PATH} 파일 수정 완료")
        return True
    except Exception as e:
        print(f"× {DEPENDENCIES_PATH} 파일 수정 실패: {e}")
        return False

if __name__ == "__main__":
    print("데이터베이스 연결 문제 해결 시작...")
    success = fix_dependencies()
    if success:
        print("수정 완료!")
    else:
        print("오류가 발생했습니다.")
        sys.exit(1) 