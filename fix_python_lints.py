#!/usr/bin/env python
import os
import re
import glob
import subprocess
from pathlib import Path

def ensure_final_newline():
    """모든 파이썬 파일에 마지막 줄 개행문자 추가"""
    print("마지막 줄 개행 추가 중...")
    for file_path in glob.glob("**/*.py", recursive=True):
        if "node_modules" in file_path or not os.path.exists(file_path):
            continue
            
        with open(file_path, 'rb+') as f:
            if os.path.getsize(file_path) == 0:
                continue
                
            f.seek(-1, os.SEEK_END)
            last_char = f.read(1)
            if last_char != b'\n':
                f.seek(0, os.SEEK_END)
                f.write(b'\n')

def fix_imports():
    """잘못된 임포트 수정"""
    print("잘못된 임포트 수정 중...")
    import_fixes = {
        r"from\s+src\.core\.cache\s+import\s+cache\b": "from src.core.cache.redis_cache import RedisCache as cache",
        r"from\s+src\.core\.cache\s+import\s+CacheKey\b": "from src.core.cache.keys import CacheKey",
        r"from\s+core\.database": "from src.core.database",
        r"import\s+git\b": "try:\n    try:
    import git
except ImportError:
    git = None\nexcept ImportError:\n    git = None",
    }
    
    for file_path in glob.glob("**/*.py", recursive=True):
        if "node_modules" in file_path or not os.path.exists(file_path):
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        modified = False
        for pattern, replacement in import_fixes.items():
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                modified = True
        
        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

def fix_function_args():
    """함수 인자 관련 오류 수정"""
    print("함수 인자 오류 수정 중...")
    files_to_fix = {
        "packages/api/src/routers/auth.py": [
            (r"auth_service\.validate_refresh_token\(\)", "auth_service.validate_refresh_token(refresh_token)"),
        ],
        "packages/api/src/routers/todos.py": [
            (r"todo_service\.create_todo\(([^,]+),\s*([^,]+),\s*message=[^\)]+\)", r"todo_service.create_todo(\1, \2)"),
        ],
        "packages/api/src/routers/shops.py": [
            (r"shop_service\.get_shop_reviews\(([^,]+),\s*([^,]+),\s*([^,]+),\s*\d+\)", r"shop_service.get_shop_reviews(\1, \2, \3)"),
        ],
    }
    
    for file_path, patterns in files_to_fix.items():
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            for pattern, replacement in patterns:
                if re.search(pattern, content):
                    content = re.sub(pattern, replacement, content)
                    modified = True
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)

def fix_boolean_comparisons():
    """부울 비교 수정"""
    print("부울 비교 수정 중...")
    for file_path in glob.glob("**/*.py", recursive=True):
        if "node_modules" in file_path or not os.path.exists(file_path):
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        #  is False/True를 is False/True로 변경 (ORM 제외)
        if not any(x in file_path for x in ["models.py", "schema.py", "repository.py"]):
            content = re.sub(r"([^\.]+)\s*==\s*False\b", r"\1 is False", content)
            content = re.sub(r"([^\.]+)\s*==\s*True\b", r"\1 is True", content)
        
        # ORM 필터에서는 is_() 메서드 사용
        if any(x in file_path for x in ["repository.py", "service.py"]):
            content = re.sub(r"([\w\.]+)\.filter\(\s*([\w\.]+)\s*==\s*False\s*\)", r"\1.filter(\2.is_(False))", content)
            content = re.sub(r"([\w\.]+)\.filter\(\s*([\w\.]+)\s*==\s*True\s*\)", r"\1.filter(\2.is_(True))", content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

def fix_duplicate_classes():
    """중복 클래스 정의 수정"""
    print("중복 클래스 수정 중...")
    files_to_check = [
        "packages/api/src/core/exceptions.py",
        "git/core/exceptions.py"
    ]
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            class_defs = {}
            to_remove = []
            
            for i, line in enumerate(lines):
                match = re.match(r"class\s+(\w+)\(", line)
                if match:
                    class_name = match.group(1)
                    if class_name in class_defs:
                        # 클래스 정의부터 pass까지 제거 대상으로 표시
                        start = i
                        for j in range(i, len(lines)):
                            if re.match(r"\s+pass", lines[j]):
                                end = j
                                break
                        else:
                            end = i + 3  # 약간의 안전장치
                        
                        to_remove.extend(range(start, end + 1))
                    else:
                        class_defs[class_name] = i
            
            # 중복 클래스 제거
            if to_remove:
                lines = [line for i, line in enumerate(lines) if i not in to_remove]
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)

def main():
    print("Python 코드베이스 린트 오류 자동 수정 시작...")
    
    # 파이썬 코드 수정
    ensure_final_newline()
    fix_imports()
    fix_function_args()
    fix_boolean_comparisons()
    fix_duplicate_classes()
    
    print("Python 코드 린트 오류 수정 완료!")

if __name__ == "__main__":
    main() 
