"""
Git 유틸리티 모듈

Git 저장소 관리를 위한 유틸리티 함수들을 제공합니다.
"""

import os
import subprocess
from typing import Dict, List, Optional, Tuple, Any, Union
import logging
from datetime import datetime

# 로거 설정
logger = logging.getLogger(__name__)

class GitError(Exception):
    """Git 작업 중 발생한 오류를 표현하는 예외 클래스"""
    pass

def run_git_command(command: List[str], repo_path: Optional[str] = None) -> Tuple[str, str]:
    """
    Git 명령어를 실행하고 결과를 반환합니다.
    
    Args:
        command: 실행할 Git 명령어와 인자들
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        
    Returns:
        stdout, stderr 튜플
        
    Raises:
        GitError: Git 명령어 실행 중 오류 발생 시
    """
    cwd = repo_path if repo_path else os.getcwd()
    
    try:
        # Git 명령어 실행
        process = subprocess.Popen(
            ["git"] + command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=cwd,
            universal_newlines=True
        )
        
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            raise GitError(f"Git 명령어 실행 오류: {stderr}")
            
        return stdout.strip(), stderr.strip()
    except Exception as e:
        logger.error(f"Git 명령어 실행 중 오류 발생: {e}")
        raise GitError(f"Git 명령어 실행 중 오류 발생: {str(e)}")

def get_repo_status(repo_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Git 저장소의 현재 상태를 조회합니다.
    
    Args:
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        
    Returns:
        저장소 상태 정보를 담은 딕셔너리
    """
    # 현재 브랜치 확인
    branch_output, _ = run_git_command(["rev-parse", "--abbrev-ref", "HEAD"], repo_path)
    current_branch = branch_output
    
    # 수정된 파일 목록 조회
    status_output, _ = run_git_command(["status", "--porcelain"], repo_path)
    
    modified = []
    staged = []
    untracked = []
    
    for line in status_output.splitlines():
        if not line.strip():
            continue
            
        status = line[:2]
        file_path = line[3:]
        
        if status[0] == "M":
            staged.append(file_path)
        elif status[0] == "A":
            staged.append(file_path)
        elif status[0] == "D":
            staged.append(file_path)
        elif status[0] == "R":
            staged.append(file_path)
            
        if status[1] == "M":
            modified.append(file_path)
        elif status[1] == "D":
            modified.append(file_path)
        elif status[0] == "?" and status[1] == "?":
            untracked.append(file_path)
    
    # 원격 저장소와의 차이 확인
    ahead_behind = get_ahead_behind(current_branch, repo_path)
    
    return {
        "branch": current_branch,
        "modified": modified,
        "staged": staged,
        "untracked": untracked,
        "ahead": ahead_behind["ahead"],
        "behind": ahead_behind["behind"]
    }

def get_ahead_behind(branch: str, repo_path: Optional[str] = None) -> Dict[str, int]:
    """
    현재 브랜치가 원격 저장소와 얼마나 차이가 나는지 확인합니다.
    
    Args:
        branch: 브랜치 이름
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        
    Returns:
        ahead, behind 값을 담은 딕셔너리
    """
    try:
        # 원격 브랜치 가져오기
        remote_branch = f"origin/{branch}"
        
        # 로컬과 원격의 차이 계산
        output, _ = run_git_command([
            "rev-list", "--left-right", "--count", f"{branch}...{remote_branch}"
        ], repo_path)
        
        ahead, behind = map(int, output.split())
        
        return {"ahead": ahead, "behind": behind}
    except GitError:
        # 원격 브랜치가 없거나 오류 발생 시
        return {"ahead": 0, "behind": 0}

def get_commit_logs(limit: int = 10, repo_path: Optional[str] = None, path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    커밋 이력을 조회합니다.
    
    Args:
        limit: 조회할 최대 커밋 수
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        path: 특정 파일/디렉토리로 필터링 (선택사항)
        
    Returns:
        커밋 정보 리스트
    """
    format_string = "--pretty=format:%H|%an|%at|%s"
    
    command = ["log", "-n", str(limit), format_string]
    if path:
        command.append("--")
        command.append(path)
    
    output, _ = run_git_command(command, repo_path)
    
    commits = []
    for line in output.splitlines():
        if not line.strip():
            continue
            
        parts = line.split("|", 3)
        if len(parts) < 4:
            continue
            
        hash_value, author, timestamp, message = parts
        
        # 변경된 파일 수 계산 (선택적)
        try:
            files_output, _ = run_git_command(["show", "--pretty=format:", "--name-only", hash_value], repo_path)
            files_changed = len(files_output.splitlines())
        except GitError:
            files_changed = 0
        
        commit_date = datetime.fromtimestamp(int(timestamp))
        
        commits.append({
            "hash": hash_value,
            "author": author,
            "date": commit_date.isoformat(),
            "message": message,
            "files_changed": files_changed
        })
    
    return commits

def get_branches(repo_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    저장소의 브랜치 목록을 조회합니다.
    
    Args:
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        
    Returns:
        브랜치 정보 리스트
    """
    output, _ = run_git_command(["branch", "-a", "--format=%(refname:short)|%(objectname:short)|%(committerdate:iso8601)"], repo_path)
    
    branches = []
    current_branch, _ = run_git_command(["rev-parse", "--abbrev-ref", "HEAD"], repo_path)
    
    for line in output.splitlines():
        if not line.strip():
            continue
            
        parts = line.split("|", 2)
        if len(parts) < 3:
            continue
            
        name, last_commit, commit_date = parts
        is_remote = name.startswith("origin/")
        
        # origin/HEAD 건너뛰기
        if name == "origin/HEAD":
            continue
            
        # 원격 브랜치 이름 정리
        display_name = name.replace("origin/", "") if is_remote else name
        
        branches.append({
            "name": name,
            "display_name": display_name,
            "current": name == current_branch,
            "remote": is_remote,
            "last_commit": last_commit,
            "last_commit_date": commit_date
        })
    
    return branches

def checkout_branch(branch: str, repo_path: Optional[str] = None) -> Dict[str, Any]:
    """
    지정된 브랜치로 전환합니다.
    
    Args:
        branch: 전환할 브랜치 이름
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        
    Returns:
        작업 결과
    """
    try:
        output, _ = run_git_command(["checkout", branch], repo_path)
        return {
            "success": True,
            "message": output or f"브랜치 '{branch}'로 전환했습니다."
        }
    except GitError as e:
        return {
            "success": False,
            "message": str(e)
        }

def commit_changes(message: str, files: Optional[List[str]] = None, repo_path: Optional[str] = None) -> Dict[str, Any]:
    """
    변경사항을 커밋합니다.
    
    Args:
        message: 커밋 메시지
        files: 커밋할 파일 목록 (None인 경우 모든 변경사항 커밋)
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        
    Returns:
        작업 결과
    """
    try:
        # 파일이 지정된 경우 add 먼저 수행
        if files:
            for file in files:
                run_git_command(["add", file], repo_path)
        else:
            # 모든 수정사항 add
            run_git_command(["add", "."], repo_path)
        
        # 커밋 수행
        output, _ = run_git_command(["commit", "-m", message], repo_path)
        
        # 최신 커밋 정보 가져오기
        commits = get_commit_logs(1, repo_path)
        
        return {
            "success": True,
            "message": output,
            "commit": commits[0] if commits else None
        }
    except GitError as e:
        return {
            "success": False,
            "message": str(e)
        }

def pull_changes(repo_path: Optional[str] = None) -> Dict[str, Any]:
    """
    원격 저장소에서 변경사항을 가져옵니다.
    
    Args:
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        
    Returns:
        작업 결과
    """
    try:
        output, _ = run_git_command(["pull"], repo_path)
        return {
            "success": True,
            "message": output or "변경사항을 성공적으로 가져왔습니다."
        }
    except GitError as e:
        return {
            "success": False,
            "message": str(e)
        }

def push_changes(repo_path: Optional[str] = None) -> Dict[str, Any]:
    """
    원격 저장소로 변경사항을 전송합니다.
    
    Args:
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        
    Returns:
        작업 결과
    """
    try:
        output, _ = run_git_command(["push"], repo_path)
        return {
            "success": True,
            "message": output or "변경사항을 성공적으로 전송했습니다."
        }
    except GitError as e:
        return {
            "success": False,
            "message": str(e)
        }

def get_diff(file_path: Optional[str] = None, repo_path: Optional[str] = None) -> Dict[str, Any]:
    """
    변경사항의 diff를 가져옵니다.
    
    Args:
        file_path: 특정 파일 경로 (None인 경우 모든 변경사항)
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        
    Returns:
        diff 정보
    """
    try:
        command = ["diff"]
        if file_path:
            command.append(file_path)
            
        output, _ = run_git_command(command, repo_path)
        
        return {
            "success": True,
            "diff": output
        }
    except GitError as e:
        return {
            "success": False,
            "message": str(e)
        }

def get_file_history(file_path: str, limit: int = 10, repo_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    특정 파일의 변경 이력을 가져옵니다.
    
    Args:
        file_path: 파일 경로
        limit: 조회할 최대 커밋 수
        repo_path: Git 저장소 경로 (기본값: 현재 디렉토리)
        
    Returns:
        파일 변경 이력
    """
    return get_commit_logs(limit, repo_path, file_path) 