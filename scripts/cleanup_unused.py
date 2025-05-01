#!/usr/bin/env python3
"""
사용되지 않는 변수 및 임포트 정리 스크립트

이 스크립트는 pylint를 사용하여 코드베이스에서 사용되지 않는 변수와 임포트를 감지하고,
변수명 앞에 언더스코어(_)를 추가하거나 불필요한 임포트를 제거하는 작업을 수행합니다.
"""

import os
import re
import sys
import subprocess
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Union

# 변경 파일 추적을 위한 변수
MODIFIED_FILES = set()

def run_pylint(target_dir: str) -> List[Dict[str, Union[str, int]]]:
    """
    대상 디렉토리에서 pylint를 실행하여 사용되지 않는 변수와 임포트 목록을 가져옵니다.
    
    Args:
        target_dir: 검사할 디렉토리 경로
        
    Returns:
        List[Dict]: 발견된 문제점 목록
    """
    print(f"[INFO] {target_dir} 디렉토리에서 미사용 변수/임포트 검사 중...")
    
    try:
        # 변수 및 임포트 미사용 경고만 활성화하고 다른 경고는 끔
        cmd = [
            "pylint",
            "--disable=all",
            "--enable=unused-variable,unused-import",
            "--output-format=json",
            target_dir
        ]
        
        result = subprocess.run(cmd, text=True, capture_output=True, check=False)
        
        if result.returncode != 0:
            # pylint는 문제 발견 시 0이 아닌 값을 반환함
            try:
                issues = []
                # JSON 형식 출력이 있는 경우에만 처리
                if result.stdout.strip():
                    import json
                    issues = json.loads(result.stdout)
                return issues
            except Exception as e:
                print(f"[ERROR] pylint 결과 파싱 오류: {e}")
                print(f"[DEBUG] 출력: {result.stdout[:500]}...")
                return []
        else:
            # 문제를 발견하지 못한 경우
            return []
            
    except Exception as e:
        print(f"[ERROR] pylint 실행 중 오류 발생: {e}")
        return []

def fix_unused_variable(file_path: str, line: int, var_name: str) -> bool:
    """
    사용되지 않는 변수 이름 앞에 언더스코어를 추가합니다.
    
    Args:
        file_path: 대상 파일 경로
        line: 변수가 정의된 줄 번호
        var_name: 변수 이름
        
    Returns:
        bool: 수정 성공 여부
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        if line <= 0 or line > len(lines):
            print(f"[ERROR] 잘못된 줄 번호: {line}, 파일: {file_path}")
            return False
            
        # 0부터 시작하는 인덱스로 변환
        line_idx = line - 1
        
        # 변수 정의 패턴 찾기
        var_line = lines[line_idx]
        
        # 변수 이름 패턴
        pattern = r'\b{}\b'.format(re.escape(var_name))
        
        # 이미 언더스코어로 시작하는 경우 무시
        if var_name.startswith('_'):
            return False
            
        # 언더스코어 추가한 변수명으로 교체
        modified_line = re.sub(pattern, f'_{var_name}', var_line)
        
        if modified_line != var_line:
            lines[line_idx] = modified_line
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            print(f"[수정] {file_path}:{line} - 변수 '{var_name}'에 언더스코어 추가")
            MODIFIED_FILES.add(file_path)
            return True
            
        return False
        
    except Exception as e:
        print(f"[ERROR] 변수 수정 중 오류 발생: {file_path}:{line} - {e}")
        return False

def remove_unused_import(file_path: str, line: int, import_name: str) -> bool:
    """
    사용되지 않는 임포트를 제거합니다.
    
    Args:
        file_path: 대상 파일 경로
        line: 임포트가 정의된 줄 번호
        import_name: 임포트 이름
        
    Returns:
        bool: 수정 성공 여부
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        if line <= 0 or line > len(lines):
            print(f"[ERROR] 잘못된 줄 번호: {line}, 파일: {file_path}")
            return False
            
        # 0부터 시작하는 인덱스로 변환
        line_idx = line - 1
        
        # 현재 줄 가져오기
        import_line = lines[line_idx]
        
        # 임포트 유형에 따라 다른 처리 함수 호출
        modified = False
        new_lines = lines.copy()
        
        if import_line.strip().startswith('from '):
            modified, new_lines = handle_from_import(lines, line_idx, import_name)
        elif import_line.strip().startswith('import '):
            modified, new_lines = handle_direct_import(lines, line_idx, import_name)
        
        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print(f"[수정] {file_path}:{line} - 임포트 '{import_name}' 제거")
            MODIFIED_FILES.add(file_path)
            return True
            
        return False
        
    except Exception as e:
        print(f"[ERROR] 임포트 제거 중 오류 발생: {file_path}:{line} - {e}")
        return False

def handle_from_import(lines: List[str], line_idx: int, import_name: str) -> Tuple[bool, List[str]]:
    """
    'from module import X' 형태의 임포트 처리
    
    Args:
        lines: 파일의 모든 줄
        line_idx: 처리할 줄의 인덱스
        import_name: 제거할 임포트 이름
        
    Returns:
        Tuple[bool, List[str]]: (수정 여부, 수정된 줄 목록)
    """
    import_line = lines[line_idx]
    new_lines = lines.copy()
    
    # 괄호 내 여러 줄 임포트 처리
    if '(' in import_line:
        print(f"[SKIP] 멀티라인 임포트는 수동 수정 필요: 줄 {line_idx + 1}")
        return False, lines
    
    # 한 줄 임포트 처리
    parts = import_line.split('import')
    if len(parts) != 2:
        return False, lines
        
    prefix = parts[0]  # from module 부분
    imports = parts[1].strip().split(',')  # X, Y, Z 부분
    
    # 해당 임포트 제거
    filtered_imports = filter_imports(imports, import_name)
    
    # 수정 적용
    if len(filtered_imports) == 0:
        # 모든 임포트가 제거된 경우 해당 줄 자체를 삭제
        new_lines.pop(line_idx)
        return True, new_lines
    else:
        # 수정된 임포트 줄 생성
        new_line = f"{prefix}import {', '.join(filtered_imports)}\n"
        new_lines[line_idx] = new_line
        return True, new_lines

def handle_direct_import(lines: List[str], line_idx: int, import_name: str) -> Tuple[bool, List[str]]:
    """
    'import X' 형태의 임포트 처리
    
    Args:
        lines: 파일의 모든 줄
        line_idx: 처리할 줄의 인덱스
        import_name: 제거할 임포트 이름
        
    Returns:
        Tuple[bool, List[str]]: (수정 여부, 수정된 줄 목록)
    """
    import_line = lines[line_idx]
    new_lines = lines.copy()
    
    imports = import_line[len('import'):].strip().split(',')
    
    # 해당 임포트 제거
    filtered_imports = filter_imports(imports, import_name)
    
    # 수정 적용
    if len(filtered_imports) == 0:
        # 모든 임포트가 제거된 경우 해당 줄 자체를 삭제
        new_lines.pop(line_idx)
        return True, new_lines
    else:
        # 수정된 임포트 줄 생성
        new_line = f"import {', '.join(filtered_imports)}\n"
        new_lines[line_idx] = new_line
        return True, new_lines

def filter_imports(imports: List[str], import_name: str) -> List[str]:
    """
    임포트 목록에서 특정 임포트를 제거합니다.
    
    Args:
        imports: 임포트 문자열 목록
        import_name: 제거할 임포트 이름
        
    Returns:
        List[str]: 필터링된 임포트 목록
    """
    filtered_imports = []
    for imp in imports:
        imp_name = imp.strip()
        if import_name != imp_name and f'as {import_name}' not in imp:
            filtered_imports.append(imp)
    
    return filtered_imports

def process_issues(issues: List[Dict[str, Union[str, int]]]) -> Tuple[int, int]:
    """
    발견된 문제점을 처리합니다.
    
    Args:
        issues: 발견된 문제점 목록
        
    Returns:
        Tuple[int, int]: 처리된 변수 수, 처리된 임포트 수
    """
    var_count = 0
    import_count = 0
    
    for issue in issues:
        file_path = issue.get('path', '')
        line = issue.get('line', 0)
        msg_id = issue.get('message-id', '')
        msg = issue.get('message', '')
        
        if not file_path or not os.path.exists(file_path):
            continue
            
        # 사용되지 않는 변수 처리
        if msg_id == 'unused-variable':
            var_count += process_unused_variable(file_path, line, msg)
        
        # 사용되지 않는 임포트 처리
        elif msg_id == 'unused-import':
            import_count += process_unused_import(file_path, line, msg)
    
    return var_count, import_count

def process_unused_variable(file_path: str, line: int, msg: str) -> int:
    """사용되지 않는 변수 처리"""
    var_match = re.search(r"Unused variable '(\w+)'", msg)
    if var_match:
        var_name = var_match.group(1)
        if fix_unused_variable(file_path, line, var_name):
            return 1
    return 0

def process_unused_import(file_path: str, line: int, msg: str) -> int:
    """사용되지 않는 임포트 처리"""
    import_match = re.search(r"Unused (\w+) imported (from|as) (?:[\w.]+)", msg)
    if import_match:
        import_name = import_match.group(1)
        if remove_unused_import(file_path, line, import_name):
            return 1
    return 0

def main():
    """스크립트 메인 함수"""
    parser = argparse.ArgumentParser(description='미사용 변수 및 임포트 정리 도구')
    parser.add_argument('--dir', '-d', required=True, help='검사할 디렉토리 경로')
    parser.add_argument('--fix', '-f', action='store_true', help='발견된 문제 자동 수정')
    
    args = parser.parse_args()
    
    target_dir = args.dir
    if not os.path.isdir(target_dir):
        print(f"[ERROR] 디렉토리를 찾을 수 없습니다: {target_dir}")
        return 1
    
    # pylint 실행
    issues = run_pylint(target_dir)
    
    if not issues:
        print(f"[INFO] {target_dir} 디렉토리에서 미사용 변수나 임포트를 발견하지 못했습니다.")
        return 0
        
    print(f"[INFO] 발견된 문제점: {len(issues)}개")
    
    # 발견된 문제 목록 출력
    for issue in issues:
        file_path = issue.get('path', '')
        line = issue.get('line', 0)
        msg = issue.get('message', '')
        print(f"{file_path}:{line} - {msg}")
    
    # 자동 수정 모드인 경우 수정 진행
    if args.fix:
        var_count, import_count = process_issues(issues)
        print(f"\n[요약] 수정된 변수: {var_count}개, 제거된 임포트: {import_count}개")
        
        if MODIFIED_FILES:
            print(f"\n[INFO] 수정된 파일 목록:")
            for f in sorted(MODIFIED_FILES):
                print(f"  - {f}")
    else:
        print("\n[INFO] 문제를 수정하려면 --fix 옵션을 사용하세요.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 