"""
유틸리티 함수 모듈.
"""

import hashlib
import imghdr
import json
import logging
import os
import re
import shlex
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from fastapi import Response

from packages.api.src.coreconstants import (
    DEFAULT_BRANCH_DEVELOP,
    DEFAULT_BRANCH_MAIN,
    DEFAULT_BRANCH_MASTER,
    DEFAULT_GIT_USER_EMAIL,
    DEFAULT_GIT_USER_NAME,
    DEFAULT_REMOTE_NAME,
    DEFAULT_REMOTE_URL,
    DEFAULT_TAG_PREFIX,
    DEFAULT_TAG_SEPARATOR,
    ERROR_GIT_NOT_INSTALLED,
    ERROR_MESSAGE_GIT_AUTHENTICATION_FAILED,
    ERROR_MESSAGE_GIT_BRANCH_NOT_FOUND,
    ERROR_MESSAGE_GIT_COMMAND_FAILED,
    ERROR_MESSAGE_GIT_COMMIT_NOT_FOUND,
    ERROR_MESSAGE_GIT_CONFIG_NOT_FOUND,
    ERROR_MESSAGE_GIT_CONFLICT,
    ERROR_MESSAGE_GIT_FILE_NOT_FOUND,
    ERROR_MESSAGE_GIT_MERGE_FAILED,
    ERROR_MESSAGE_GIT_NOT_INSTALLED,
    ERROR_MESSAGE_GIT_PULL_FAILED,
    ERROR_MESSAGE_GIT_PUSH_FAILED,
    ERROR_MESSAGE_GIT_REMOTE_NOT_FOUND,
    ERROR_MESSAGE_GIT_TAG_NOT_FOUND,
    ERROR_MESSAGE_NOT_GIT_REPOSITORY,
    ERROR_NOT_GIT_REPOSITORY,
    GIT_COMMAND,
    GIT_COMMAND_RETRY_COUNT,
    GIT_COMMAND_RETRY_DELAY,
    GIT_COMMAND_TIMEOUT,
    GIT_STATUS_CLEAN,
    GIT_STATUS_CONFLICT,
    GIT_STATUS_MODIFIED,
    GIT_STATUS_STAGED,
    GIT_STATUS_UNTRACKED,
)
from packages.api.src.coreexceptions import (
    GitAuthenticationException,
    GitBranchException,
    GitCommandException,
    GitConfigException,
    GitConflictException,
    GitException,
    GitMergeException,
    GitOperationException,
    GitRemoteException,
    GitRepositoryException,
    GitTagException,
)
from packages.api.src.coretypes import (
    FileHistory,
    GitBranch,
    GitChange,
    GitChanges,
    GitCommit,
    GitConfig,
    GitRemote,
    GitStatus,
    GitTag,
)

logger = logging.getLogger(__name__)

# 상수 정의
DATE_PREFIX = "Date:"
TEST_ITEM = "Test Item"


def get_etag(data: Union[Dict, List, str, bytes]) -> str:
    """
    데이터로부터 ETag를 생성합니다.

    Args:
        data: ETag를 생성할 데이터

    Returns:
        생성된 ETag 문자열
    """
    if isinstance(data, (dict, list)):
        data = json.dumps(data, sort_keys=True)
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.md5(data).hexdigest()


def check_etag(etag: str, if_none_match: Optional[str]) -> bool:
    """
    ETag와 클라이언트의 if-none-match 헤더를 비교합니다.

    Args:
        etag: 서버의 ETag
        if_none_match: 클라이언트의 if-none-match 헤더 값

    Returns:
        ETag가 일치하면 True, 아니면 False
    """
    if not if_none_match:
        return False
    return etag == if_none_match.strip('"')


def snake_to_camel(snake_str: str) -> str:
    """
    snake_case 문자열을 camelCase로 변환합니다.

    Args:
        snake_str: 변환할 snake_case 문자열

    Returns:
        변환된 camelCase 문자열
    """
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def camel_to_snake(camel_str: str) -> str:
    """
    camelCase 문자열을 snake_case로 변환합니다.

    Args:
        camel_str: 변환할 camelCase 문자열

    Returns:
        변환된 snake_case 문자열
    """
    return re.sub(r"(?<!^)(?=[A-Z])", "_", camel_str).lower()


def build_query_params(params: Dict[str, Any]) -> str:
    """
    딕셔너리를 쿼리 파라미터 문자열로 변환합니다.

    Args:
        params: 쿼리 파라미터 딕셔너리

    Returns:
        쿼리 파라미터 문자열
    """
    return "&".join(f"{k}={v}" for k, v in params.items() if v is not None)


def filter_none_values(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    딕셔너리에서 None 값을 제거합니다.

    Args:
        data: 필터링할 딕셔너리

    Returns:
        None 값이 제거된 딕셔너리
    """
    return {k: v for k, v in data.items() if v is not None}


def paginate_list(items: List[Any], page: int, per_page: int) -> Dict[str, Any]:
    """
    리스트를 페이지네이션합니다.

    Args:
        items: 페이지네이션할 리스트
        page: 페이지 번호 (1부터 시작)
        per_page: 페이지당 항목 수

    Returns:
        페이지네이션된 결과 딕셔너리
    """
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "items": items[start:end],
        "total": len(items),
        "page": page,
        "per_page": per_page,
        "total_pages": (len(items) + per_page - 1) // per_page,
    }


def validate_image_file(file_path: Union[str, Path]) -> bool:
    """
    파일이 유효한 이미지 파일인지 확인합니다.

    Args:
        file_path: 확인할 파일 경로

    Returns:
        유효한 이미지 파일이면 True, 아니면 False
    """
    try:
        return imghdr.what(file_path) is not None
    except Exception:
        return False


def is_git_installed() -> bool:
    """
    Git이 설치되어 있는지 확인합니다.

    Returns:
        bool: Git이 설치되어 있으면 True, 아니면 False
    """
    try:
        subprocess.run(["git", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def is_git_repository(path: str) -> bool:
    """
    주어진 경로가 Git 저장소인지 확인합니다.

    Args:
        path (str): 확인할 경로

    Returns:
        bool: Git 저장소이면 True, 아니면 False
    """
    git_dir = Path(path) / ".git"
    return git_dir.exists() and git_dir.is_dir()


def parse_git_status(status_output: str) -> Dict[str, Any]:
    """
    Git 상태 출력을 파싱합니다.

    Args:
        status_output (str): Git 상태 출력

    Returns:
        Dict[str, Any]: 파싱된 상태 정보
    """
    status = {
        "branch": "",
        "is_clean": True,
        "modified_files": [],
        "staged_files": [],
        "untracked_files": [],
    }

    lines = status_output.split("\n")
    for line in lines:
        if line.startswith("On branch"):
            status["branch"] = line.split(" ")[2]
        elif line.startswith("Changes to be committed"):
            status["is_clean"] = False
        elif line.startswith("Changes not staged for commit"):
            status["is_clean"] = False
        elif line.startswith("Untracked files"):
            status["is_clean"] = False
        elif line.startswith("\tmodified:"):
            status["modified_files"].append(line.split(":")[1].strip())
        elif line.startswith("\tnew file:"):
            status["staged_files"].append(line.split(":")[1].strip())
        elif line.startswith("\t"):
            status["untracked_files"].append(line.strip())

    return status


def parse_date_info(date_str: str) -> Dict[str, str]:
    """
    날짜 정보 파싱

    Args:
        date_str: 날짜 문자열

    Returns:
        Dict[str, str]: 파싱된 날짜 정보
    """
    if not date_str:
        return {}

    try:
        # 날짜 정보 파싱
        date_parts = date_str.split()
        if len(date_parts) < 2:
            return {}

        return {
            "date": date_parts[1],
            "time": date_parts[2] if len(date_parts) > 2 else "",
            "timezone": date_parts[3] if len(date_parts) > 3 else "",
        }
    except Exception:
        return {}


def parse_commit_info(commit_output: str) -> Dict[str, str]:
    """
    커밋 정보 파싱

    Args:
        commit_output: 커밋 정보 출력

    Returns:
        Dict[str, str]: 파싱된 커밋 정보
    """
    if not commit_output:
        return {}

    try:
        # 커밋 정보 파싱
        lines = commit_output.split("\n")
        info = {}

        for line in lines:
            if line.startswith("commit"):
                info["hash"] = line.split()[1]
            elif line.startswith("Author"):
                info["author"] = line.split(":", 1)[1].strip()
            elif line.startswith("Date"):
                info.update(parse_date_info(line))

        return info
    except Exception:
        return {}


def parse_branch_info(branch: str) -> GitBranch:
    """
    Git 브랜치 정보를 파싱하는 함수

    Args:
        branch (str): Git 브랜치 정보

    Returns:
        GitBranch: 파싱된 Git 브랜치 정보
    """
    lines = branch.splitlines()
    result: GitBranch = {
        "name": "",
        "is_current": False,
        "is_remote": False,
        "commit": "",
        "message": "",
    }

    for line in lines:
        if line.startswith("*"):
            result["is_current"] = True
            line = line[1:].strip()
        if line.startswith("remotes/"):
            result["is_remote"] = True
            line = line[8:].strip()
        parts = line.split(" ", 1)
        result["name"] = parts[0]
        if len(parts) > 1:
            result["message"] = parts[1].strip()
        result["commit"] = line.split(" ")[0]

    return result


def parse_tag_info(tag: str) -> GitTag:
    """
    Git 태그 정보를 파싱하는 함수

    Args:
        tag (str): Git 태그 정보

    Returns:
        GitTag: 파싱된 Git 태그 정보
    """
    lines = tag.splitlines()
    result: GitTag = {
        "name": "",
        "commit": "",
        "message": "",
        "date": datetime.now(),
    }

    for line in lines:
        if line.startswith("tag"):
            result["name"] = line.split(" ")[1]
        elif line.startswith("Tagger:"):
            result["message"] = line.split(":")[1].strip()
        elif line.startswith("Date:"):
            date_str = line.split(":")[1].strip()
            result["date"] = datetime.strptime(date_str, "%a %b %d %H:%M:%S %Y %z")
        elif line.startswith("commit"):
            result["commit"] = line.split(" ")[1]

    return result


def parse_file_history(history: str) -> FileHistory:
    """
    Git 파일 변경 이력을 파싱하는 함수

    Args:
        history (str): Git 파일 변경 이력

    Returns:
        FileHistory: 파싱된 Git 파일 변경 이력
    """
    lines = history.splitlines()
    result: FileHistory = {
        "file": "",
        "commits": [],
    }

    for line in lines:
        if line.startswith("commit"):
            commit = parse_commit_info(line)
            result["commits"].append(commit)
        elif line.startswith("Author:"):
            continue
        elif line.startswith("Date:"):
            continue
        elif line.startswith("    "):
            continue
        else:
            result["file"] = line.strip()

    return result


def parse_changes(changes: str) -> GitChanges:
    """
    Git 변경 사항을 파싱하는 함수

    Args:
        changes (str): Git 변경 사항

    Returns:
        GitChanges: 파싱된 Git 변경 사항
    """
    lines = changes.splitlines()
    result: GitChanges = {
        "total_changes": 0,
        "additions": 0,
        "deletions": 0,
        "changes": [],
    }

    for line in lines:
        if line.startswith("diff --git"):
            change: GitChange = {
                "file": "",
                "status": "",
                "additions": 0,
                "deletions": 0,
                "diff": "",
            }
            parts = line.split(" ")
            change["file"] = parts[2][2:]
            result["changes"].append(change)
        elif line.startswith("+++ b/"):
            continue
        elif line.startswith("--- a/"):
            continue
        elif line.startswith("@@ "):
            continue
        elif line.startswith("+"):
            result["additions"] += 1
            result["total_changes"] += 1
            change["additions"] += 1
            change["diff"] += line + "\n"
        elif line.startswith("-"):
            result["deletions"] += 1
            result["total_changes"] += 1
            change["deletions"] += 1
            change["diff"] += line + "\n"
        else:
            change["diff"] += line + "\n"

    return result


def parse_remote_info(remote: str) -> GitRemote:
    """
    Git 원격 저장소 정보를 파싱하는 함수

    Args:
        remote (str): Git 원격 저장소 정보

    Returns:
        GitRemote: 파싱된 Git 원격 저장소 정보
    """
    lines = remote.splitlines()
    result: GitRemote = {
        "name": "",
        "url": "",
        "fetch": "",
        "push": "",
    }

    for line in lines:
        if line.startswith("origin"):
            result["name"] = line.split("\t")[0]
            result["url"] = line.split("\t")[1].split(" ")[0]
            result["fetch"] = line.split("\t")[1].split(" ")[1]
            result["push"] = line.split("\t")[1].split(" ")[2]

    return result


def parse_config_info(config: str) -> GitConfig:
    """
    Git 설정 정보를 파싱하는 함수

    Args:
        config (str): Git 설정 정보

    Returns:
        GitConfig: 파싱된 Git 설정 정보
    """
    lines = config.splitlines()
    result: GitConfig = {
        "user": {
            "name": "",
            "email": "",
        },
        "core": {
            "repositoryformatversion": "",
            "filemode": "",
            "bare": "",
            "logallrefupdates": "",
        },
        "remote": {
            "origin": {
                "url": "",
                "fetch": "",
            },
        },
        "branch": {
            "main": {
                "remote": "",
                "merge": "",
            },
        },
    }

    for line in lines:
        if line.startswith("user.name"):
            result["user"]["name"] = line.split("=")[1].strip()
        elif line.startswith("user.email"):
            result["user"]["email"] = line.split("=")[1].strip()
        elif line.startswith("core.repositoryformatversion"):
            result["core"]["repositoryformatversion"] = line.split("=")[1].strip()
        elif line.startswith("core.filemode"):
            result["core"]["filemode"] = line.split("=")[1].strip()
        elif line.startswith("core.bare"):
            result["core"]["bare"] = line.split("=")[1].strip()
        elif line.startswith("core.logallrefupdates"):
            result["core"]["logallrefupdates"] = line.split("=")[1].strip()
        elif line.startswith("remote.origin.url"):
            result["remote"]["origin"]["url"] = line.split("=")[1].strip()
        elif line.startswith("remote.origin.fetch"):
            result["remote"]["origin"]["fetch"] = line.split("=")[1].strip()
        elif line.startswith("branch.main.remote"):
            result["branch"]["main"]["remote"] = line.split("=")[1].strip()
        elif line.startswith("branch.main.merge"):
            result["branch"]["main"]["merge"] = line.split("=")[1].strip()

    return result


def build_error_details(
    command: str, returncode: int, stderr: str, stdout: str = ""
) -> Dict[str, Any]:
    """
    에러 상세 정보를 구성합니다.

    Args:
        command (str): 실행된 명령어
        returncode (int): 반환 코드
        stderr (str): 표준 에러 출력
        stdout (str): 표준 출력

    Returns:
        Dict[str, Any]: 에러 상세 정보
    """
    return {
        "command": command,
        "returncode": returncode,
        "stderr": stderr.strip(),
        "stdout": stdout.strip(),
    }


def run_git_command(
    command: List[str],
    cwd: Optional[str] = None,
    timeout: int = GIT_COMMAND_TIMEOUT,
    retry_count: int = GIT_COMMAND_RETRY_COUNT,
    retry_delay: int = GIT_COMMAND_RETRY_DELAY,
) -> str:
    """
    Git 명령어를 실행합니다.

    Args:
        command (List[str]): 실행할 Git 명령어
        cwd (Optional[str]): 작업 디렉토리
        timeout (int): 명령어 실행 제한 시간
        retry_count (int): 재시도 횟수
        retry_delay (int): 재시도 간격

    Returns:
        str: 명령어 실행 결과

    Raises:
        GitCommandException: 명령어 실행에 실패한 경우
    """
    if not is_git_installed():
        raise GitException(ERROR_GIT_NOT_INSTALLED)

    if cwd and not is_git_repository(cwd):
        raise GitException(ERROR_NOT_GIT_REPOSITORY)

    for attempt in range(retry_count):
        try:
            result = subprocess.run(
                ["git"] + command,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            if result.returncode == 0:
                return result.stdout.strip()

            if attempt < retry_count - 1:
                time.sleep(retry_delay)
                continue

            raise GitCommandException(
                ERROR_GIT_COMMAND_FAILED,
                details={
                    "command": " ".join(command),
                    "returncode": result.returncode,
                    "stderr": result.stderr.strip(),
                },
            )

        except subprocess.TimeoutExpired as e:
            if attempt < retry_count - 1:
                time.sleep(retry_delay)
                continue
            raise GitCommandException(
                ERROR_GIT_COMMAND_FAILED,
                details={
                    "command": " ".join(command),
                    "error": f"Command timed out after {timeout} seconds",
                },
            )

        except subprocess.SubprocessError as e:
            if attempt < retry_count - 1:
                time.sleep(retry_delay)
                continue
            raise GitCommandException(
                ERROR_GIT_COMMAND_FAILED,
                details={"command": " ".join(command), "error": str(e)},
            )
