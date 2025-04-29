#!/usr/bin/env python3
import subprocess
import sys
import os
from datetime import datetime

def run_vulnerability_scan():
    """의존성 보안 취약점 스캔"""
    print("의존성 취약점 스캔 중...")
    try:
        result = subprocess.run(
            ["safety", "check", "--full-report"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print("취약점이 발견되었습니다!")
            print(result.stdout)
            return False
        else:
            print("모든 의존성이 안전합니다.")
            return True
    except Exception as e:
        print(f"취약점 스캔 실패: {str(e)}")
        print("'safety' 명령어가 설치되어 있는지 확인하세요. 설치하려면: pip install safety")
        return False

def run_static_analysis():
    """정적 코드 분석"""
    print("코드 보안 정적 분석 중...")
    try:
        result = subprocess.run(
            ["bandit", "-r", "gitmanager", "-f", "txt"],
            capture_output=True,
            text=True
        )
        
        # 결과 확인 로직
        if "No issues identified" in result.stdout or result.returncode == 0:
            print("코드 보안 분석 완료: 문제 없음")
            return True
        else:
            print("보안 문제가 발견되었습니다!")
            print(result.stdout)
            return False
    except Exception as e:
        print(f"정적 분석 실패: {str(e)}")
        print("'bandit' 명령어가 설치되어 있는지 확인하세요. 설치하려면: pip install bandit")
        return False

def check_hardcoded_secrets():
    """하드코딩된 시크릿 검사"""
    print("하드코딩된 시크릿 검사 중...")
    try:
        # 'trufflehog' 또는 'gitleaks' 같은 도구를 사용할 수 있습니다.
        # 여기서는 간단한 grep 명령을 사용합니다.
        patterns = [
            "password", 
            "secret", 
            "api[_-]?key", 
            "access[_-]?token",
            "auth[_-]?token"
        ]
        
        found_secrets = False
        for pattern in patterns:
            result = subprocess.run(
                ["grep", "-i", "-r", pattern, "--include=*.py", "gitmanager"],
                capture_output=True,
                text=True
            )
            
            if result.stdout and result.returncode == 0:
                print(f"잠재적인 하드코딩된 시크릿 패턴 '{pattern}' 발견:")
                for line in result.stdout.splitlines():
                    # 설정 파일 및 현재 스크립트 제외
                    if "config/settings.py" not in line and "security_check.py" not in line:
                        print(line)
                        found_secrets = True
        
        if not found_secrets:
            print("하드코딩된 시크릿이 발견되지 않았습니다.")
            return True
        return not found_secrets
    except Exception as e:
        print(f"시크릿 검사 실패: {str(e)}")
        return False

def check_dependency_updates():
    """의존성 업데이트 확인"""
    print("의존성 업데이트 확인 중...")
    try:
        result = subprocess.run(
            ["pip", "list", "--outdated"],
            capture_output=True,
            text=True
        )
        
        outdated_packages = []
        for line in result.stdout.splitlines()[2:]:  # 헤더 줄 건너뛰기
            if line.strip():
                parts = line.split()
                if len(parts) >= 3:
                    package = parts[0]
                    current_version = parts[1]
                    latest_version = parts[2]
                    outdated_packages.append((package, current_version, latest_version))
        
        if outdated_packages:
            print("업데이트가 필요한 패키지:")
            for package, current, latest in outdated_packages:
                print(f"  {package}: {current} -> {latest}")
            print("\n업데이트를 권장합니다: pip install --upgrade <package-name>")
            return False
        else:
            print("모든 패키지가 최신 버전입니다.")
            return True
    except Exception as e:
        print(f"의존성 업데이트 확인 실패: {str(e)}")
        return False

if __name__ == "__main__":
    print(f"보안 점검 시작: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # 각각의 보안 검사 실행
    vuln_check = run_vulnerability_scan()
    print("\n" + "=" * 60)
    
    static_check = run_static_analysis()
    print("\n" + "=" * 60)
    
    secrets_check = check_hardcoded_secrets()
    print("\n" + "=" * 60)
    
    deps_check = check_dependency_updates()
    print("\n" + "=" * 60)
    
    # 결과 종합
    results = {
        "의존성 취약점 검사": vuln_check,
        "정적 코드 분석": static_check,
        "하드코딩된 시크릿 검사": secrets_check,
        "의존성 업데이트 확인": deps_check
    }
    
    print("\n보안 검사 결과 요약:")
    all_passed = True
    for check_name, passed in results.items():
        status = "✓ 통과" if passed else "⨯ 실패"
        print(f"  {check_name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n✓ 모든 보안 검사가 통과되었습니다!")
        sys.exit(0)
    else:
        print("\n⨯ 일부 보안 검사가 실패했습니다. 조치가 필요합니다!")
        sys.exit(1) 