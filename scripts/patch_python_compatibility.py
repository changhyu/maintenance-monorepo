#!/usr/bin/env python3
"""
Python 호환성 패치 스크립트

이 스크립트는 Python 3.12에서의 호환성 문제를 해결하기 위한 패치를 적용합니다.
"""

import os
import sys
import importlib.util
import re
import shutil
from pathlib import Path
import subprocess

# 색상 설정
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

def print_colored(color, message):
    """색상이 적용된 텍스트를 출력합니다."""
    if os.name == 'nt':  # Windows
        print(message)
    else:
        print(f"{color}{message}{NC}")

def run_subprocess(command):
    """서브프로세스 명령을 실행합니다."""
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print_colored(RED, f"명령 실행 중 오류 발생: {e}")
        print_colored(YELLOW, f"오류 출력: {e.stderr}")
        return None

def get_venv_paths():
    """프로젝트의 가상환경 경로들을 반환합니다."""
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    venv_paths = []
    # 루트 가상환경
    root_venv = os.path.join(project_root, '.venv')
    if os.path.exists(root_venv):
        venv_paths.append(root_venv)
    
    # 패키지 가상환경
    packages_dir = os.path.join(project_root, 'packages')
    if os.path.exists(packages_dir):
        for pkg in os.listdir(packages_dir):
            pkg_venv = os.path.join(packages_dir, pkg, 'venv')
            if os.path.exists(pkg_venv):
                venv_paths.append(pkg_venv)
    
    return venv_paths

def update_pip_in_venv(venv_path):
    """가상환경의 pip를 업데이트합니다."""
    if os.name == 'nt':  # Windows
        pip_path = os.path.join(venv_path, 'Scripts', 'pip')
    else:
        pip_path = os.path.join(venv_path, 'bin', 'pip')
    
    if not os.path.exists(pip_path):
        pip_path += '.exe' if os.name == 'nt' else ''
        if not os.path.exists(pip_path):
            print_colored(YELLOW, f"pip을 찾을 수 없습니다: {pip_path}")
            return False
    
    print_colored(BLUE, f"{venv_path} 가상환경의 pip 업데이트 중...")
    result = run_subprocess([pip_path, "install", "--upgrade", "pip"])
    if result:
        print_colored(GREEN, f"✓ pip 업데이트 완료: {venv_path}")
        return True
    return False

def install_packages_in_venv(venv_path, requirements_path):
    """가상환경에 requirements.txt의 패키지들을 설치합니다."""
    if not os.path.exists(requirements_path):
        print_colored(YELLOW, f"requirements.txt 파일을 찾을 수 없습니다: {requirements_path}")
        return False
    
    if os.name == 'nt':  # Windows
        pip_path = os.path.join(venv_path, 'Scripts', 'pip')
    else:
        pip_path = os.path.join(venv_path, 'bin', 'pip')
    
    if not os.path.exists(pip_path):
        pip_path += '.exe' if os.name == 'nt' else ''
        if not os.path.exists(pip_path):
            print_colored(YELLOW, f"pip을 찾을 수 없습니다: {pip_path}")
            return False
    
    print_colored(BLUE, f"{venv_path} 가상환경에 패키지 설치 중...")
    result = run_subprocess([pip_path, "install", "-r", requirements_path])
    if result:
        print_colored(GREEN, f"✓ 패키지 설치 완료: {venv_path}")
        return True
    return False

def patch_gitpython():
    """GitPython 패치를 적용합니다."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    patch_script = os.path.join(script_dir, "patch_gitpython.py")
    
    if not os.path.exists(patch_script):
        print_colored(YELLOW, f"GitPython 패치 스크립트를 찾을 수 없습니다: {patch_script}")
        return False
    
    print_colored(BLUE, "GitPython 패치 적용 중...")
    result = run_subprocess([sys.executable, patch_script])
    if result:
        print_colored(GREEN, "✓ GitPython 패치 적용 완료")
        return True
    return False

def main():
    """메인 함수"""
    print_colored(BLUE, "========== Python 호환성 패치 시작 ==========\n")
    
    # Python 버전 확인
    print(f"Python 버전: {sys.version}")
    
    # 가상환경 경로 가져오기
    venv_paths = get_venv_paths()
    if not venv_paths:
        print_colored(YELLOW, "가상환경을 찾을 수 없습니다.")
    else:
        print_colored(GREEN, f"발견된 가상환경: {len(venv_paths)}개")
        
        # 각 가상환경 업데이트
        for venv_path in venv_paths:
            print_colored(BLUE, f"\n가상환경 처리 중: {venv_path}")
            
            # pip 업데이트
            update_pip_in_venv(venv_path)
            
            # 상위 디렉토리의 requirements.txt 찾기
            parent_dir = os.path.dirname(venv_path)
            requirements_path = os.path.join(parent_dir, "requirements.txt")
            
            # requirements.txt가 없으면 루트 디렉토리에서 찾기
            if not os.path.exists(requirements_path):
                project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                requirements_path = os.path.join(project_root, "requirements.txt")
            
            # 패키지 설치
            if os.path.exists(requirements_path):
                install_packages_in_venv(venv_path, requirements_path)
            else:
                print_colored(YELLOW, "requirements.txt 파일을 찾을 수 없습니다.")
    
    # GitPython 패치 적용
    patch_gitpython()
    
    print_colored(BLUE, "\n========== Python 호환성 패치 완료 ==========")

if __name__ == "__main__":
    main()
