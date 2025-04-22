"""
Git 작업을 위한 공통 유틸리티 모듈

Git 명령어 실행, 결과 파싱 등의 유틸리티 함수를 제공합니다.
"""

import logging
import os
import re
import subprocess
from contextlib import suppress
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, TypeVar, Union, cast

from gitmanager.git.core.exceptions import (
    GitCommandException,
    GitOperationException,
    GitRepositoryException,
)

# 상수 정의
DATE_PREFIX = "Date:"
CONFLICT_MARKER_START = "<<<<<<<"
CONFLICT_MARKER_MIDDLE = "======="
CONFLICT_MARKER_END = ">>>>>>>"
GIT_COMMAND_TIMEOUT = 30
GIT_COMMAND_RETRY_COUNT = 3
GIT_COMMAND_RETRY_DELAY = 1

logger = logging.getLogger(__name__)


def run_git_command(
    args: List[str],
    cwd: Optional[str] = None,
    check: bool = True,
    encoding: str = "utf-8",
    **kwargs,
) -> str:
    """
    Git 명령어를 실행하고 결과를 반환합니다.

    Args:
        args: Git 명령어 리스트 (예: ["log", "-1"])
        cwd: 실행할 디렉토리 경로
        check: 명령어 실패 시 예외 발생 여부
        encoding: 출력 인코딩
        **kwargs: subprocess.run에 전달할 추가 인자

    Returns:
        str: 명령어 실행 결과 문자열

    Raises:
        GitCommandException: 명령어 실행 실패 시
    """
    cmd = ["git"] + args
    try:
        process = subprocess.run(
            cmd,
            cwd=cwd,
            check=check,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding=encoding,
            **kwargs,
        )
        return process.stdout
    except subprocess.CalledProcessError as e:
        error_details = build_error_details(e)
        raise GitCommandException(
            f"Git 명령어 실행 실패: {e}",
            command=" ".join(cmd),
            exit_code=e.returncode,
            stderr=e.stderr if hasattr(e, "stderr") else "",
        ) from e
    except Exception as e:
        raise GitCommandException(
            f"Git 명령어 실행 중 오류 발생: {e}",
            command=" ".join(cmd),
            exit_code=-1,
            stderr=str(e),
        ) from e


def is_git_installed() -> bool:
    """
    Git이 시스템에 설치되어 있는지 확인합니다.

    Returns:
        bool: Git이 설치되어 있으면 True, 아니면 False
    """
    try:
        subprocess.run(
            ["git", "--version"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def is_git_repository(path: str) -> bool:
    """
    특정 경로가 유효한 Git 저장소인지 확인합니다.

    Args:
        path: 확인할 경로

    Returns:
        bool: 유효한 Git 저장소이면 True, 아니면 False
    """
    try:
        # .git 디렉토리 확인
        git_dir = Path(path) / ".git"
        if not git_dir.exists() or not git_dir.is_dir():
            return False

        # git rev-parse 명령으로 확인
        run_git_command(["rev-parse", "--is-inside-work-tree"], cwd=path)
        return True
    except Exception:
        return False


def parse_git_status(status_output: str) -> Dict[str, List[Dict[str, str]]]:
    """
    Git status 출력을 파싱합니다.

    Args:
        status_output: git status --porcelain 명령의 출력

    Returns:
        Dict[str, List[Dict[str, str]]]: 'staged', 'unstaged', 'untracked' 카테고리별
        파일 상태 정보를 담은 딕셔너리
    """
    result: Dict[str, List[Dict[str, str]]] = {
        "staged": [],
        "unstaged": [],
        "untracked": [],
    }

    for line in status_output.splitlines():
        if not line:
            continue

        status = line[:2]
        file_path = line[3:].strip()

        # 스테이징된 변경사항
        if status[0] not in {" ", "?"}:
            result["staged"].append(
                {"path": file_path, "status": get_status_type(status[0])}
            )

        # 스테이징되지 않은 변경사항
        if status[1] != " ":
            result["unstaged"].append(
                {"path": file_path, "status": get_status_type(status[1])}
            )

        # 추적되지 않는 파일
        if status == "??":
            result["untracked"].append({"path": file_path, "status": "untracked"})

    return result


def get_status_type(status_code: str) -> str:
    """
    상태 코드를 읽기 쉬운 상태 유형으로 변환합니다.

    Args:
        status_code: git status 상태 코드 (한 글자)

    Returns:
        str: 'modified', 'added', 'deleted' 등의 상태 유형 문자열
    """
    status_map = {
        "M": "modified",
        "A": "added",
        "D": "deleted",
        "R": "renamed",
        "C": "copied",
        "U": "updated_but_unmerged",
        "?": "untracked",
    }
    return status_map.get(status_code, "unknown")


def parse_commit_info(commit_line: str) -> Dict[str, str]:
    """
    Git log 명령의 커밋 출력 라인을 파싱합니다.

    Args:
        commit_line: "%h|%an|%ae|%s|%ci" 형식의 커밋 라인

    Returns:
        파싱된 커밋 정보
    """
    parts: List[str] = commit_line.split("|")
    if len(parts) < 5:
        return {}

    return {
        "hash": parts[0],
        "author": parts[1],
        "email": parts[2],
        "message": parts[3],
        "date": parts[4],
    }


def build_error_details(e: Exception) -> Dict[str, Any]:
    """예외 객체로부터 오류 상세 정보를 생성합니다.

    Args:
        e: 예외 객체

    Returns:
        오류 상세 정보를 담은 딕셔너리
    """
    details = {"type": type(e).__name__}

    if isinstance(e, subprocess.CalledProcessError):
        with suppress(UnicodeDecodeError):
            stderr = (
                e.stderr.decode("utf-8")
                if isinstance(e.stderr, bytes)
                else str(e.stderr)
            ).strip()
            details.update(
                {"command": e.cmd, "exit_code": e.returncode, "stderr": stderr}
            )

    return details


def parse_branch_info(branch_line: str) -> Dict[str, Any]:
    """
    Git branch 명령의 출력 라인을 파싱합니다.

    Args:
        branch_line: 브랜치 정보 라인

    Returns:
        파싱된 브랜치 정보
    """
    parts: List[str] = branch_line.strip().split()
    if not parts:
        return {}

    is_current: bool = parts[0] == "*"
    name: str = parts[1] if is_current else parts[0]
    tracking: Optional[str] = None

    # 원격 브랜치 추적 정보 파싱
    if len(parts) > (2 if is_current else 1):
        tracking_info: str = " ".join(parts[2:])
        if "[" in tracking_info and "]" in tracking_info:
            tracking = tracking_info[
                tracking_info.find("[") + 1 : tracking_info.find("]")
            ]

    return {
        "name": name,
        "is_current": is_current,
        "tracking": tracking,
        "is_remote": name.startswith("remotes/"),
    }


def parse_tag_info(tag_line: str) -> Dict[str, Any]:
    """
    Git tag 명령의 출력 라인을 파싱합니다.

    Args:
        tag_line: 태그 정보 라인

    Returns:
        파싱된 태그 정보
    """
    parts: List[str] = tag_line.strip().split()
    if not parts:
        return {}

    name: str = parts[0]
    commit_hash: Optional[str] = None
    message: Optional[str] = None

    # 태그 메시지가 있는 경우
    if len(parts) > 1:
        commit_hash = parts[1]
        if len(parts) > 2:
            message = " ".join(parts[2:])

    return {"name": name, "commit": commit_hash, "message": message}


def parse_file_history(history_output: str) -> List[Dict[str, Any]]:
    """
    Git log 명령의 파일 히스토리 출력을 파싱합니다.

    Args:
        history_output: git log --pretty=format:"%h|%an|%ae|%s|%ci" --name-status 명령의 출력

    Returns:
        파싱된 파일 히스토리 정보 목록
    """
    history: List[Dict[str, Any]] = []
    current_commit: Optional[Dict[str, Any]] = None

    for line in history_output.split("\n"):
        if not line.strip():
            continue

        # 커밋 정보 라인
        if "|" in line:
            parts = line.split("|")
            if len(parts) >= 5:
                current_commit = {
                    "hash": parts[0],
                    "author": parts[1],
                    "email": parts[2],
                    "message": parts[3],
                    "date": parts[4],
                    "changes": [],
                }
                history.append(current_commit)

        # 파일 변경 정보 라인
        elif current_commit is not None and line[0] in ["A", "M", "D", "R"]:
            status = line[0]
            file_path = line[1:].strip()

            change_type = {
                "A": "added",
                "M": "modified",
                "D": "deleted",
                "R": "renamed",
            }.get(status, "unknown")

            current_commit["changes"].append({"type": change_type, "path": file_path})

    return history


def parse_changes(changes_output: str) -> List[Dict[str, Any]]:
    """
    Git diff 또는 status 명령의 변경사항 출력을 파싱합니다.

    Args:
        changes_output: git diff 또는 status 명령의 출력

    Returns:
        파싱된 변경사항 정보 목록
    """
    changes: List[Dict[str, Any]] = []
    current_file: Optional[Dict[str, Any]] = None

    for line in changes_output.split("\n"):
        if not line.strip():
            continue

        # 파일 상태 라인
        if line.startswith(("A ", "M ", "D ", "R ")):
            status = line[0]
            file_path = line[2:].strip()

            change_type = {
                "A": "added",
                "M": "modified",
                "D": "deleted",
                "R": "renamed",
            }.get(status, "unknown")

            current_file = {"type": change_type, "path": file_path, "diff": []}
            changes.append(current_file)

        # 변경 내용 라인
        elif current_file is not None and line.startswith(("+", "-", " ")):
            current_file["diff"].append(line)

    return changes


def parse_remote_info(remote_output: str) -> Dict[str, Dict[str, str]]:
    """
    Git remote 명령의 출력을 파싱하여 원격 저장소 정보를 반환합니다.

    Args:
        remote_output: git remote -v 명령의 출력

    Returns:
        원격 저장소 정보 딕셔너리
        {
            "origin": {
                "fetch": "https://github.com/user/repo.git",
                "push": "https://github.com/user/repo.git"
            }
        }
    """
    remotes: Dict[str, Dict[str, str]] = {}

    for line in remote_output.split("\n"):
        if not line.strip():
            continue

        parts = line.split()
        if len(parts) >= 3:
            name = parts[0]
            url = parts[1]
            operation = parts[2].strip("()")

            if name not in remotes:
                remotes[name] = {}

            remotes[name][operation] = url

    return remotes


def parse_config_info(output: str) -> Dict[str, Dict[str, str]]:
    """
    Git 설정 정보 파싱

    Args:
        output: git config --list 명령어 출력

    Returns:
        Dict[str, Dict[str, str]]: 섹션별 설정 정보
    """
    if not output:
        return {}

    config: Dict[str, Dict[str, str]] = {}
    for line in output.splitlines():
        if not line.strip() or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        # 키가 섹션.서브섹션.이름 형식인 경우
        if "." in key:
            parts = key.split(".")
            if len(parts) >= 2:
                section = parts[0]
                if len(parts) >= 3:
                    subsection = parts[1]
                    name = ".".join(parts[2:])
                else:
                    subsection = "main"
                    name = ".".join(parts[1:])

                if section not in config:
                    config[section] = {}
                if subsection not in config[section]:
                    config[section][subsection] = {}
                config[section][subsection][name] = value
        else:
            # 단순 키-값 쌍인 경우
            if "core" not in config:
                config["core"] = {}
            if "main" not in config["core"]:
                config["core"]["main"] = {}
            config["core"]["main"][key] = value

    return config


def parse_commit_message(commit: Any) -> Dict[str, str]:
    """
    커밋 메시지 파싱

    Args:
        commit: Git 커밋 객체

    Returns:
        Dict[str, str]: 제목과 본문을 포함한 딕셔너리
    """
    message: str = commit.message.strip()
    if "\n\n" in message:
        title, body = message.split("\n\n", 1)
        return {"title": title.strip(), "body": body.strip()}
    return {"title": message, "body": ""}


def parse_diff_stats(diff_output: str) -> Dict[str, str]:
    """
    Git diff 통계 정보 파싱

    Args:
        diff_output: git diff --stat 명령어 출력

    Returns:
        Dict[str, str]: 통계 정보 (추가된 라인, 삭제된 라인, 변경된 파일 수 등)
    """
    stats: Dict[str, str] = {}

    if not diff_output:
        return stats

    lines = diff_output.strip().split("\n")
    summary_line = lines[-1] if lines else ""

    # 요약 라인에서 통계 추출 (예: "2 files changed, 3 insertions(+), 1 deletion(-)")
    if "changed" in summary_line:
        # 파일 수
        files_match = re.search(r"(\d+) files? changed", summary_line)
        if files_match:
            stats["files_changed"] = files_match.group(1)

        # 추가 라인 수
        insertions_match = re.search(r"(\d+) insertions?\(\+\)", summary_line)
        if insertions_match:
            stats["insertions"] = insertions_match.group(1)

        # 삭제 라인 수
        deletions_match = re.search(r"(\d+) deletions?\(-\)", summary_line)
        if deletions_match:
            stats["deletions"] = deletions_match.group(1)

    return stats


def get_diff_stats(diff: Any) -> Dict[str, int]:
    """
    GitPython의 Diff 객체로부터 통계 정보를 추출합니다.

    Args:
        diff: GitPython의 Diff 객체

    Returns:
        Dict[str, int]: 통계 정보 (추가된 라인, 삭제된 라인, 변경된 파일 수 등)
    """
    return {
        "insertions": getattr(diff, "insertions", 0),
        "deletions": getattr(diff, "deletions", 0),
        "files_changed": getattr(diff, "files_changed", 0),
    }


def parse_stash_info(stash_output: str) -> List[Dict[str, Any]]:
    """
    Git stash list 명령의 출력을 파싱하여 스태시 정보를 반환합니다.

    Args:
        stash_output: git stash list 명령의 출력

    Returns:
        스태시 정보 목록
        [
            {
                "id": "stash@{0}",
                "branch": "main",
                "message": "WIP on main: abc1234 Commit message"
            }
        ]
    """
    stashes: List[Dict[str, Any]] = []

    for line in stash_output.split("\n"):
        if not line.strip():
            continue

        # stash@{0}: WIP on main: abc1234 Commit message
        parts = line.split(":", 1)
        if len(parts) != 2:
            continue

        stash_id = parts[0].strip()
        message = parts[1].strip()

        # WIP on main: abc1234 Commit message
        message_parts = message.split(":", 1)
        if len(message_parts) != 2:
            continue

        branch_info = message_parts[0].strip()
        commit_message = message_parts[1].strip()

        # WIP on main
        branch_parts = branch_info.split(" on ")
        if len(branch_parts) != 2:
            continue

        branch = branch_parts[1].strip()

        stashes.append({"id": stash_id, "branch": branch, "message": commit_message})

    return stashes


def parse_submodule_info(submodule_output: str) -> Dict[str, Dict[str, str]]:
    """
    Git submodule status 명령의 출력을 파싱하여 서브모듈 정보를 반환합니다.

    Args:
        submodule_output: git submodule status 명령의 출력

    Returns:
        서브모듈 정보 딕셔너리
        {
            "submodule/path": {
                "commit": "abc1234",
                "path": "submodule/path",
                "url": "https://github.com/user/repo.git"
            }
        }
    """
    submodules: Dict[str, Dict[str, str]] = {}

    for line in submodule_output.split("\n"):
        if not line.strip():
            continue

        # abc1234 submodule/path (v1.0.0)
        parts = line.split()
        if len(parts) < 2:
            continue

        commit = parts[0]
        path = parts[1]

        submodules[path] = {"commit": commit, "path": path}

        # URL 정보 추가 (git config 명령으로 가져옴)
        try:
            url = run_git_command(["config", f"submodule.{path}.url"])
            submodules[path]["url"] = url
        except Exception:
            pass

    return submodules


def parse_merge_conflicts(status_output: str) -> List[Dict[str, Any]]:
    """
    Git 병합 충돌 정보 파싱

    Args:
        status_output: git status 명령어 출력

    Returns:
        List[Dict[str, Any]]: 충돌 정보 목록
    """
    conflicts: List[Dict[str, Any]] = []
    conflict_statuses: Dict[str, str] = {
        "UU": "both modified",
        "AA": "both added",
        "DD": "both deleted",
    }

    for line in status_output.split("\n"):
        if not line.strip():
            continue

        parts = line.split()
        if len(parts) < 2:
            continue

        status = parts[0]
        if status in conflict_statuses:
            conflict = {
                "path": parts[1],
                "status": conflict_statuses[status],
                "ours": "HEAD",
                "theirs": "MERGE_HEAD",
                "conflict_markers": find_conflict_markers(parts[1]),
            }
            conflicts.append(conflict)

    return conflicts


def find_conflict_markers(file_path: str) -> Dict[str, int]:
    """
    파일에서 충돌 마커의 위치를 찾습니다.

    Args:
        file_path: 충돌이 발생한 파일 경로

    Returns:
        충돌 마커 위치 정보
    """
    markers: Dict[str, int] = {"start": -1, "middle": -1, "end": -1}

    with suppress(Exception), open(file_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            if line.startswith(CONFLICT_MARKER_START):
                markers["start"] = i
            elif line.startswith(CONFLICT_MARKER_MIDDLE):
                markers["middle"] = i
            elif line.startswith(CONFLICT_MARKER_END):
                markers["end"] = i

    return markers


def parse_reflog_info(reflog_output: str) -> List[Dict[str, str]]:
    """
    Git reflog 정보 파싱

    Args:
        reflog_output: git reflog 명령어 출력

    Returns:
        List[Dict[str, str]]: reflog 정보 목록
    """
    entries: List[Dict[str, str]] = []
    for line in reflog_output.split("\n"):
        if not line.strip():
            continue

        parts = line.split(" ", 2)
        if len(parts) < 3:
            continue

        entry = {
            "commit": parts[0],
            "action": parts[1],
            "message": parts[2].strip(),
            "timestamp": "",
            "previous_commit": "",
        }
        entries.append(entry)

    return entries


def parse_tag_message(tag_output: str) -> Dict[str, Any]:
    """
    Git tag 메시지를 파싱합니다.

    Args:
        tag_output: git tag -l --format='%(refname:short)|%(objectname)|%(contents)' 명령의 출력

    Returns:
        태그 정보
        {
            "name": "v1.0.0",
            "commit": "abc1234",
            "message": "Release version 1.0.0"
        }
    """
    parts: List[str] = tag_output.split("|", 2)
    if len(parts) != 3:
        return {}

    return {"name": parts[0], "commit": parts[1], "message": parts[2].strip()}


def parse_worktree_info(worktree_output: str) -> List[Dict[str, Any]]:
    """
    Git worktree 명령의 출력을 파싱합니다.

    Args:
        worktree_output: git worktree list 명령의 출력

    Returns:
        worktree 정보 목록
        [
            {
                "path": "/path/to/worktree",
                "branch": "feature-branch",
                "commit": "abc1234"
            }
        ]
    """
    worktrees: List[Dict[str, Any]] = []

    for line in worktree_output.split("\n"):
        if not line.strip():
            continue

        parts = line.split()
        if len(parts) < 3:
            continue

        path = parts[0]
        commit = parts[1]
        branch = parts[2].strip("[]")

        worktrees.append({"path": path, "branch": branch, "commit": commit})

    return worktrees


def parse_lfs_info(lfs_output: str) -> Dict[str, Any]:
    """
    Git LFS 정보를 파싱합니다.

    Args:
        lfs_output: git lfs ls-files 명령의 출력

    Returns:
        LFS 파일 정보
        {
            "files": [
                {
                    "path": "large-file.bin",
                    "oid": "abc1234",
                    "size": 1024
                }
            ]
        }
    """
    files: List[Dict[str, Any]] = []

    for line in lfs_output.split("\n"):
        if not line.strip():
            continue

        parts = line.split()
        if len(parts) < 3:
            continue

        oid = parts[0]
        size = int(parts[1])
        path = " ".join(parts[2:])

        files.append({"path": path, "oid": oid, "size": size})

    return {"files": files}


def parse_hook_info(hook_output: str) -> Dict[str, Dict[str, Any]]:
    """
    Git hook 정보를 파싱합니다.

    Args:
        hook_output: ls .git/hooks 명령의 출력

    Returns:
        hook 정보
        {
            "pre-commit": {
                "path": ".git/hooks/pre-commit",
                "enabled": true
            }
        }
    """
    hooks: Dict[str, Dict[str, Any]] = {}
    hook_names: List[str] = [
        "applypatch-msg",
        "pre-applypatch",
        "post-applypatch",
        "pre-commit",
        "prepare-commit-msg",
        "commit-msg",
        "post-commit",
        "pre-rebase",
        "post-checkout",
        "post-merge",
        "pre-push",
        "pre-receive",
        "update",
        "post-receive",
        "post-update",
        "push-to-checkout",
        "pre-auto-gc",
        "post-rewrite",
    ]

    for line in hook_output.split("\n"):
        if not line.strip():
            continue

        for hook_name in hook_names:
            if hook_name in line:
                hooks[hook_name] = {"path": f".git/hooks/{hook_name}", "enabled": True}

    return hooks


def parse_ignore_patterns(ignore_output: str) -> List[str]:
    """
    .gitignore 파일의 패턴을 파싱합니다.

    Args:
        ignore_output: .gitignore 파일 내용

    Returns:
        무시 패턴 목록
    """
    patterns: List[str] = []

    for line in ignore_output.split("\n"):
        line = line.strip()
        if line and not line.startswith("#"):
            patterns.append(line)

    return patterns


def parse_attributes(attributes_output: str) -> Dict[str, Dict[str, str]]:
    """
    .gitattributes 파일의 속성을 파싱합니다.

    Args:
        attributes_output: .gitattributes 파일 내용

    Returns:
        파일 속성 정보
        {
            "*.py": {
                "text": "auto",
                "eol": "lf"
            }
        }
    """
    attributes: Dict[str, Dict[str, str]] = {}

    for line in attributes_output.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        parts = line.split()
        if len(parts) < 2:
            continue

        pattern = parts[0]
        attrs: Dict[str, str] = {}

        for attr in parts[1:]:
            if "=" in attr:
                key, value = attr.split("=", 1)
                attrs[key] = value
            else:
                attrs[attr] = "true"

        attributes[pattern] = attrs

    return attributes


def format_commit_date(date: datetime) -> str:
    """
    커밋 날짜 포맷팅

    Args:
        date: datetime 객체

    Returns:
        str: 포맷된 날짜 문자열
    """
    return date.strftime("%Y-%m-%d %H:%M:%S")


def extract_issue_numbers(message: str) -> List[str]:
    """
    커밋 메시지에서 이슈 번호 추출

    Args:
        message: 커밋 메시지

    Returns:
        List[str]: 이슈 번호 목록
    """
    return re.findall(r"#(\d+)", message)


def get_commit_author_info(commit: Any) -> Dict[str, str]:
    """
    커밋 작성자 정보 추출

    Args:
        commit: Git 커밋 객체

    Returns:
        Dict[str, str]: 작성자 정보
    """
    return {
        "name": commit.author.name,
        "email": commit.author.email,
        "date": format_commit_date(commit.authored_datetime),
    }


def parse_single_file_stats(line: str) -> Dict[str, Any]:
    """
    단일 파일 통계 파싱

    Args:
        line: 통계 정보가 포함된 문자열

    Returns:
        Dict[str, Any]: 파일 통계 정보
    """
    with suppress(ValueError):
        parts: List[str] = line.strip().split()
        if len(parts) >= 2:
            return {"file": parts[0], "changes": int(parts[1])}
    return {}


def create_error_details(operation: str, code: int, message: str) -> Dict[str, Any]:
    """
    에러 상세 정보 생성

    Args:
        operation: 작업 이름
        code: 에러 코드
        message: 에러 메시지

    Returns:
        Dict[str, Any]: 에러 상세 정보
    """
    return {
        "operation": operation,
        "code": code,
        "message": message,
        "timestamp": datetime.now().isoformat(),
    }
