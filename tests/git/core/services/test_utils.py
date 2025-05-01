"""
Git 서비스 테스트를 위한 유틸리티 함수 모듈
"""
import os
import shutil
import tempfile
import subprocess
from typing import Optional, List, Dict, Any, Tuple
from contextlib import contextmanager


@contextmanager
def temp_git_repo(init_repo: bool = True):
    """
    테스트용 임시 Git 저장소를 생성하는 컨텍스트 매니저
    
    Args:
        init_repo: 저장소 초기화 여부
        
    Yields:
        str: 임시 저장소 경로
    """
    temp_dir = tempfile.mkdtemp()
    try:
        if init_repo:
            subprocess.run(
                ["git", "init", temp_dir],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # 기본 설정 (테스트용)
            subprocess.run(
                ["git", "config", "--local", "user.name", "Test User"],
                cwd=temp_dir,
                check=True
            )
            subprocess.run(
                ["git", "config", "--local", "user.email", "test@example.com"],
                cwd=temp_dir,
                check=True
            )
            
        yield temp_dir
    finally:
        shutil.rmtree(temp_dir)


def create_test_file(repo_path: str, file_path: str, content: str) -> str:
    """
    Git 저장소에 테스트 파일 생성
    
    Args:
        repo_path: 저장소 경로
        file_path: 파일 경로 (저장소 내 상대 경로)
        content: 파일 내용
        
    Returns:
        str: 생성된 파일의 절대 경로
    """
    full_path = os.path.join(repo_path, file_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    with open(full_path, 'w') as f:
        f.write(content)
        
    return full_path


def make_commit(repo_path: str, message: str, files: Optional[List[str]] = None) -> str:
    """
    Git 저장소에 커밋 생성
    
    Args:
        repo_path: 저장소 경로
        message: 커밋 메시지
        files: 커밋할 파일 목록 (None이면 전체 변경사항)
        
    Returns:
        str: 커밋 해시
    """
    if files:
        for file in files:
            subprocess.run(
                ["git", "add", file],
                cwd=repo_path,
                check=True
            )
    else:
        subprocess.run(
            ["git", "add", "--all"],
            cwd=repo_path,
            check=True
        )
        
    subprocess.run(
        ["git", "commit", "-m", message],
        cwd=repo_path,
        check=True
    )
    
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repo_path,
        check=True,
        stdout=subprocess.PIPE
    )
    
    return result.stdout.decode('utf-8').strip()


def create_branch(repo_path: str, branch_name: str, checkout: bool = False) -> None:
    """
    Git 저장소에 브랜치 생성
    
    Args:
        repo_path: 저장소 경로
        branch_name: 브랜치 이름
        checkout: 생성 후 체크아웃 여부
    """
    if checkout:
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=repo_path,
            check=True
        )
    else:
        subprocess.run(
            ["git", "branch", branch_name],
            cwd=repo_path,
            check=True
        )


def checkout_branch(repo_path: str, branch_name: str) -> None:
    """
    Git 저장소에서 브랜치 체크아웃
    
    Args:
        repo_path: 저장소 경로
        branch_name: 브랜치 이름
    """
    subprocess.run(
        ["git", "checkout", branch_name],
        cwd=repo_path,
        check=True
    )


def get_current_branch(repo_path: str) -> str:
    """
    현재 체크아웃된 브랜치 이름 조회
    
    Args:
        repo_path: 저장소 경로
        
    Returns:
        str: 현재 브랜치 이름
    """
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=repo_path,
        check=True,
        stdout=subprocess.PIPE
    )
    
    return result.stdout.decode('utf-8').strip()


def create_merge_conflict(repo_path: str) -> Tuple[str, str, List[str]]:
    """
    병합 충돌 상황 생성
    
    Args:
        repo_path: 저장소 경로
        
    Returns:
        Tuple[str, str, List[str]]: 
            (원본 브랜치, 충돌 브랜치, 충돌 파일 목록)
    """
    # 초기 파일 생성 및 커밋
    create_test_file(repo_path, "conflict.txt", "Initial content\nShared line\nAnother line")
    make_commit(repo_path, "Initial commit with conflict file")
    
    # 브랜치 생성
    original_branch = "main"
    conflict_branch = "feature/conflict"
    create_branch(repo_path, conflict_branch, checkout=True)
    
    # 충돌 브랜치에서 파일 수정 및 커밋
    create_test_file(repo_path, "conflict.txt", "Initial content\nShared line changed in feature\nAnother line")
    make_commit(repo_path, "Change in feature branch")
    
    # 원본 브랜치로 돌아가서 같은 파일 수정 및 커밋
    checkout_branch(repo_path, original_branch)
    create_test_file(repo_path, "conflict.txt", "Initial content\nShared line changed in main\nAnother line")
    make_commit(repo_path, "Change in main branch")
    
    return original_branch, conflict_branch, ["conflict.txt"]


def get_file_content(repo_path: str, file_path: str) -> str:
    """
    Git 저장소 내 파일 내용 조회
    
    Args:
        repo_path: 저장소 경로
        file_path: 파일 경로 (저장소 내 상대 경로)
        
    Returns:
        str: 파일 내용
    """
    full_path = os.path.join(repo_path, file_path)
    
    with open(full_path, 'r') as f:
        return f.read()


def setup_remote_repo(local_path: str) -> str:
    """
    테스트용 원격 저장소 설정
    
    Args:
        local_path: 로컬 저장소 경로
        
    Returns:
        str: 원격 저장소 경로
    """
    # 원격 저장소 생성
    remote_path = tempfile.mkdtemp()
    subprocess.run(
        ["git", "init", "--bare", remote_path],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # 로컬 저장소에 원격 저장소 연결
    subprocess.run(
        ["git", "remote", "add", "origin", remote_path],
        cwd=local_path,
        check=True
    )
    
    return remote_path 