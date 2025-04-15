#!/usr/bin/env python3
"""
config.py 구문 오류 수정 스크립트
"""

import os
import sys

# 파일 경로
CONFIG_PATH = os.path.join("packages", "api", "src", "core", "config.py")

def fix_config():
    """config.py 파일에서 마지막 줄의 구문 오류 수정"""
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as file:
            lines = file.readlines()
        
        # 마지막 줄이 \n으로 끝나는지 확인하고 수정
        if len(lines) > 0 and lines[-1].strip() == "\\n":
            lines[-1] = "# 설정 인스턴스 생성\nsettings = Settings()"
        elif len(lines) > 0 and "settings = Settings()" not in lines[-10:]:
            lines.append("\n# 설정 인스턴스 생성\nsettings = Settings()")
        
        with open(CONFIG_PATH, "w", encoding="utf-8") as file:
            file.writelines(lines)
        
        print(f"✓ {CONFIG_PATH} 파일 수정 완료")
        return True
    except Exception as e:
        print(f"× {CONFIG_PATH} 파일 수정 실패: {e}")
        return False

if __name__ == "__main__":
    print("config.py 파일 수정 시작...")
    success = fix_config()
    if success:
        print("수정 완료!")
    else:
        print("오류가 발생했습니다.")
        sys.exit(1) 