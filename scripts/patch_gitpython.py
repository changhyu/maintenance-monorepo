#!/usr/bin/env python3
"""
GitPython 패치 스크립트

이 스크립트는 GitPython 라이브러리에 Python 3.12 호환성 패치를 적용합니다.
"""

import os
import sys
import importlib.util
import re
import shutil
from pathlib import Path

# 색상 설정
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

def find_gitpython_path():
    """GitPython 패키지 경로를 찾습니다."""
    try:
        spec = importlib.util.find_spec('git')
        if spec is None:
            print(f"{RED}GitPython이 설치되어 있지 않습니다.{NC}")
            return None
        
        git_path = os.path.dirname(spec.origin)
        print(f"{GREEN}GitPython 경로: {git_path}{NC}")
        return git_path
    except Exception as e:
        print(f"{RED}GitPython 경로를 찾는 중 오류 발생: {e}{NC}")
        return None

def backup_file(file_path):
    """파일의 백업을 생성합니다."""
    backup_path = f"{file_path}.bak"
    shutil.copy2(file_path, backup_path)
    print(f"{YELLOW}백업 생성: {backup_path}{NC}")
    return backup_path

def patch_gitpython_files(git_path):
    """GitPython 파일들에 패치를 적용합니다."""
    if not git_path:
        return False
    
    # 패치가 필요한 파일들
    patch_files = [
        os.path.join(git_path, "repo", "base.py"),
        os.path.join(git_path, "cmd.py"),
        os.path.join(git_path, "config.py"),
        os.path.join(git_path, "remote.py"),
    ]
    
    success = True
    
    for file_path in patch_files:
        if not os.path.exists(file_path):
            print(f"{YELLOW}파일을 찾을 수 없습니다: {file_path}{NC}")
            continue
        
        # 백업 생성
        backup_file(file_path)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # collections.Mapping -> collections.abc.Mapping 패치
            patched_content = re.sub(
                r'from collections import (.*?)Mapping(.*?)',
                r'from collections.abc import \1Mapping\2',
                content
            )
            
            # os.errno -> errno 패치
            patched_content = re.sub(
                r'os\.errno\.([A-Z]+)',
                r'errno.\1',
                patched_content
            )
            
            # errno 임포트 추가
            if 'import errno' not in patched_content and 'os.errno' in content:
                patched_content = "import errno\n" + patched_content
            
            # 변경 사항이 있는 경우에만 파일 덮어쓰기
            if content != patched_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(patched_content)
                print(f"{GREEN}✓ 패치 적용됨: {file_path}{NC}")
            else:
                print(f"{YELLOW}변경 사항 없음: {file_path}{NC}")
                
        except Exception as e:
            print(f"{RED}파일 패치 중 오류 발생: {file_path} - {e}{NC}")
            success = False
    
    return success

def main():
    """메인 함수"""
    print(f"{BLUE}========== GitPython 호환성 패치 시작 =========={NC}\n")
    
    # Python 버전 확인
    print(f"Python 버전: {sys.version}")
    
    # GitPython 경로 찾기
    git_path = find_gitpython_path()
    
    # 패치 적용
    if git_path:
        success = patch_gitpython_files(git_path)
        if success:
            print(f"\n{GREEN}✓ GitPython 패치가 성공적으로 적용되었습니다.{NC}")
        else:
            print(f"\n{YELLOW}일부 파일에 패치 적용 중 문제가 발생했습니다.{NC}")
    else:
        print(f"\n{RED}패치를 적용할 수 없습니다. GitPython이 설치되어 있는지 확인하세요.{NC}")
    
    print(f"\n{BLUE}========== GitPython 호환성 패치 완료 =========={NC}")

if __name__ == "__main__":
    main()
