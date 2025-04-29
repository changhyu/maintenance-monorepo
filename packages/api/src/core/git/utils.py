import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from git import Commit, Diff, Repo


def parse_commit_message(commit: Commit) -> Dict[str, str]:
    """커밋 메시지를 파싱하여 제목과 본문을 분리합니다."""
    message = commit.message.strip()
    parts = message.split("\n", 1)
    return {"title": parts[0], "body": parts[1] if len(parts) > 1 else ""}


def get_diff_stats(diff: Diff) -> Dict[str, int]:
    """diff의 통계 정보를 반환합니다."""
    return {
        "insertions": diff.insertions,
        "deletions": diff.deletions,
        "files_changed": diff.files_changed,
    }


def format_commit_date(date: datetime) -> str:
    """커밋 날짜를 포맷팅합니다."""
    return date.strftime("%Y-%m-%d %H:%M:%S")


def extract_issue_numbers(message: str) -> List[str]:
    """커밋 메시지에서 이슈 번호를 추출합니다."""
    pattern = r"#(\d+)"
    return re.findall(pattern, message)


def get_commit_author_info(commit: Commit) -> Dict[str, str]:
    """커밋 작성자의 정보를 반환합니다."""
    return {
        "name": commit.author.name,
        "email": commit.author.email,
        "date": format_commit_date(commit.authored_datetime),
    }
