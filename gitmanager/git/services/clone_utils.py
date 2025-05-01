"""
Git 저장소 클론 관련 유틸리티 모듈
보안 강화 버전의 clone_repository 함수 구현
"""
import os
import re
import uuid
import shutil
import logging
import tempfile
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Union, Any, Tuple

# 상대 경로 임포트로 수정
from ...git.core.utils import run_git_command
from ...git.core.exceptions import GitRepositoryException, GitCommandException

# 로깅 설정
logger = logging.getLogger(__name__)

# 안전하지 않은 URL 패턴 (명령어 인젝션 등 방지)
UNSAFE_URL_PATTERNS = [
    r'[;&|<>]',               # 명령어 인젝션 문자
    r'`.*`',                  # 백틱 명령 실행
    r'\$\(.*\)',              # 명령어 대체
    r'file://',               # 로컬 파일 프로토콜
    r'--upload-pack=',        # Git 위험 플래그
    r'--config=',             # 설정 변경 플래그
    r'-o.*remote\..*\..*',    # 위험한 원격 설정
]

# 안전한 스키마 목록
SAFE_URL_SCHEMAS = ['https://', 'git://', 'http://']

def is_safe_git_url(url: str) -> bool:
    """
    Git URL이 안전한지 확인합니다.
    
    Args:
        url: 확인할 Git URL
        
    Returns:
        bool: 안전한 URL이면 True, 그렇지 않으면 False
    """
    # 빈 URL 또는 None 거부
    if not url or not isinstance(url, str):
        return False
        
    # 안전한 스키마로 시작하는지 확인
    has_safe_schema = any(url.startswith(schema) for schema in SAFE_URL_SCHEMAS)
    if not has_safe_schema:
        return False
        
    # 위험한 패턴이 포함되어 있는지 확인
    for pattern in UNSAFE_URL_PATTERNS:
        if re.search(pattern, url):
            return False
            
    return True

def sanitize_clone_options(options: Dict[str, Any]) -> Dict[str, Any]:
    """
    클론 옵션을 검증하고 안전한 옵션만 허용합니다.
    
    Args:
        options: 검증할 옵션 딕셔너리
        
    Returns:
        Dict[str, Any]: 안전한 옵션만 포함된 딕셔너리
    """
    # 허용된 옵션 키 목록
    ALLOWED_OPTIONS = {'branch', 'depth', 'single-branch', 'no-tags', 'bare'}
    
    # 안전한 옵션만 추출
    safe_options = {}
    for key, value in options.items():
        if key in ALLOWED_OPTIONS:
            # 각 옵션 값 검증
            if key == 'branch':
                if isinstance(value, str) and re.match(r'^[\w\-\.\/]+$', value):
                    safe_options[key] = value
            elif key == 'depth':
                if isinstance(value, int) and value > 0:
                    safe_options[key] = value
            elif key in {'single-branch', 'no-tags', 'bare'}:
                if isinstance(value, bool):
                    safe_options[key] = value
                    
    return safe_options

def create_safe_temp_dir(prefix: str = "git_temp_") -> str:
    """
    안전한 임시 디렉토리 생성
    
    Args:
        prefix: 디렉토리 이름 접두사
        
    Returns:
        str: 생성된 임시 디렉토리 경로
    """
    # 사용자 권한으로 실행 중인 tempfile 사용
    temp_dir = tempfile.mkdtemp(prefix=prefix)
    
    # 디렉토리 권한 설정 (700: 소유자만 읽기/쓰기/실행 가능)
    os.chmod(temp_dir, 0o700)
    
    return temp_dir

def clone_repository(
    repo_url: str,
    target_dir: Optional[str] = None,
    options: Optional[Dict[str, Any]] = None,
) -> str:
    """
    안전하게 Git 저장소를 클론합니다.
    
    Args:
        repo_url: 복제할 저장소 URL
        target_dir: 저장소를 복제할 대상 디렉토리 (지정하지 않으면 임시 디렉토리)
        options: 클론 옵션 (branch, depth 등)
        
    Returns:
        str: 복제된 저장소 경로
        
    Raises:
        GitRepositoryException: 저장소 복제 중 오류 발생시
    """
    temp_dir = None
    options = options or {}
    
    try:
        # URL 안전성 검증
        if not is_safe_git_url(repo_url):
            raise GitRepositoryException(f"안전하지 않은 Git URL: {repo_url}")
            
        # 옵션 검증
        safe_options = sanitize_clone_options(options)
        
        # 대상 디렉토리 설정
        if not target_dir:
            # 임시 디렉토리 생성
            temp_dir = create_safe_temp_dir()
            target_dir = temp_dir
        else:
            # 사용자 지정 디렉토리 검증
            target_dir = os.path.abspath(target_dir)
            
            # 디렉토리가 이미 존재하는 경우
            if os.path.exists(target_dir):
                if os.listdir(target_dir):  # 디렉토리가 비어있지 않은 경우
                    unique_suffix = uuid.uuid4().hex[:8]
                    backup_dir = f"{target_dir}_backup_{unique_suffix}"
                    logger.warning(f"대상 디렉토리가 이미 존재하고 비어있지 않습니다. 백업 중: {backup_dir}")
                    shutil.move(target_dir, backup_dir)
                else:
                    # 비어있는 디렉토리 삭제
                    shutil.rmtree(target_dir)
                    
            # 디렉토리 생성
            os.makedirs(target_dir, exist_ok=True)
            
        # Git 명령 구성
        git_args = ["clone"]
        
        # 옵션 추가
        if 'branch' in safe_options:
            git_args.extend(["--branch", safe_options['branch']])
            
        if 'depth' in safe_options:
            git_args.extend(["--depth", str(safe_options['depth'])])
            
        if safe_options.get('single-branch', False):
            git_args.append("--single-branch")
            
        if safe_options.get('no-tags', False):
            git_args.append("--no-tags")
            
        if safe_options.get('bare', False):
            git_args.append("--bare")
            
        # URL과 대상 디렉토리 추가
        git_args.extend([repo_url, target_dir])
        
        # URL 마스킹 (로깅용)
        masked_url = re.sub(r'(https?://)([^:]+:[^@]+@)', r'\1***:***@', repo_url)
        logger.info(f"저장소 클론 시작: {masked_url} -> {target_dir}")
        
        # Git 명령 실행
        run_git_command(git_args)
        
        logger.info(f"저장소 클론 성공: {masked_url} -> {target_dir}")
        return target_dir
        
    except GitCommandException as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise GitRepositoryException(f"Git 저장소 클론 실패: {str(e)}")
        
    except Exception as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        logger.error(f"저장소 클론 중 예기치 않은 오류: {str(e)}")
        raise GitRepositoryException(f"Git 저장소 클론 중 오류 발생: {str(e)}")

def clone_with_callback(
    repo_url: str,
    callback: callable,
    options: Optional[Dict[str, Any]] = None,
    *args, **kwargs
) -> Any:
    """
    저장소를 임시 디렉토리에 클론하고 콜백 함수를 실행한 후 정리합니다.
    
    Args:
        repo_url: 복제할 저장소 URL
        callback: 실행할 콜백 함수 (첫 번째 인자로 저장소 경로 전달)
        options: 클론 옵션 (branch, depth 등)
        *args, **kwargs: 콜백에 전달할 추가 인자
        
    Returns:
        Any: 콜백 함수의 반환값
    """
    temp_dir = None
    try:
        # 저장소 클론
        temp_dir = clone_repository(repo_url, options=options)
        
        # 콜백 실행
        return callback(temp_dir, *args, **kwargs)
        
    finally:
        # 임시 디렉토리 정리
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            logger.debug(f"임시 저장소 정리 완료: {temp_dir}") 