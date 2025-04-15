#!/usr/bin/env python3
"""
API 서버 포트 충돌 문제 해결 스크립트
"""

import os
import sys
import re

# 포트 설정 변경
def change_port(new_port=8080):
    """API 서버의 포트를 변경합니다"""
    
    # 환경 변수 파일 수정
    api_env_path = os.path.join("packages", "api", ".env")
    try:
        with open(api_env_path, "r", encoding="utf-8") as file:
            content = file.read()
        
        # PORT 값을 변경
        new_content = re.sub(r"PORT=\d+", f"PORT={new_port}", content)
        
        with open(api_env_path, "w", encoding="utf-8") as file:
            file.write(new_content)
            
        print(f"✓ API 서버 포트를 {new_port}으로 변경했습니다.")
        
        # run.sh 파일 수정
        run_sh_path = os.path.join("packages", "api", "run.sh")
        if os.path.exists(run_sh_path):
            with open(run_sh_path, "r", encoding="utf-8") as file:
                content = file.read()
                
            # 포트 번호 변경
            new_content = re.sub(r"--port \d+", f"--port {new_port}", content)
            
            with open(run_sh_path, "w", encoding="utf-8") as file:
                file.write(new_content)
                
            print(f"✓ run.sh 스크립트의 포트를 {new_port}으로 변경했습니다.")
        
        return True
    except Exception as e:
        print(f"× 포트 변경 실패: {e}")
        return False

def main():
    """포트 충돌 문제 해결 스크립트 실행"""
    new_port = 8080
    if len(sys.argv) > 1:
        try:
            new_port = int(sys.argv[1])
        except ValueError:
            print(f"유효하지 않은 포트 번호입니다: {sys.argv[1]}")
            print(f"기본값 {new_port}을 사용합니다.")
    
    print(f"API 서버 포트를 {new_port}으로 변경합니다...")
    success = change_port(new_port)
    
    if success:
        print("\n포트 변경 완료!")
        print(f"이제 API 서버가 포트 {new_port}에서 실행됩니다.")
        print("\n서버를 시작하려면:")
        print("npm run dev:api - API 서버 실행")
    else:
        print("\n포트 변경에 실패했습니다.")
        sys.exit(1)

if __name__ == "__main__":
    main() 