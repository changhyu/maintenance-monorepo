"""
Git 관련 데이터 모델을 정의하는 모듈
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GitStatus(BaseModel):
    """Git 저장소 상태 정보"""

    branch: str = Field(..., description="현재 브랜치 이름")
    is_clean: bool = Field(..., description="작업 디렉토리가 깨끗한지 여부")
    modified_files: List[str] = Field(
        default_factory=list, description="수정된 파일 목록"
    )
    staged_files: List[str] = Field(
        default_factory=list, description="스테이징된 파일 목록"
    )
    untracked_files: List[str] = Field(
        default_factory=list, description="추적되지 않은 파일 목록"
    )


class GitCommit(BaseModel):
    """Git 커밋 정보"""

    hash: str = Field(..., description="커밋 해시")
    author: str = Field(..., description="작성자")
    date: str = Field(..., description="커밋 날짜")
    message: str = Field(..., description="커밋 메시지")
    parent_hashes: List[str] = Field(
        default_factory=list, description="부모 커밋 해시 목록"
    )


class GitBranch(BaseModel):
    """Git 브랜치 정보"""

    name: str = Field(..., description="브랜치 이름")
    is_current: bool = Field(..., description="현재 브랜치 여부")
    is_remote: bool = Field(..., description="원격 브랜치 여부")
    last_commit: Optional[GitCommit] = Field(None, description="마지막 커밋 정보")


class GitTag(BaseModel):
    """Git 태그 정보"""

    name: str = Field(..., description="태그 이름")
    commit_hash: str = Field(..., description="태그가 가리키는 커밋 해시")
    is_annotated: bool = Field(..., description="주석 태그 여부")
    message: Optional[str] = Field(None, description="태그 메시지 (주석 태그인 경우)")


class GitRemote(BaseModel):
    """Git 원격 저장소 정보"""

    name: str = Field(..., description="원격 저장소 이름")
    url: str = Field(..., description="원격 저장소 URL")
    fetch_url: Optional[str] = Field(None, description="페치 URL")
    push_url: Optional[str] = Field(None, description="푸시 URL")


class GitConfig(BaseModel):
    """Git 설정 정보"""

    user_name: Optional[str] = Field(None, description="사용자 이름")
    user_email: Optional[str] = Field(None, description="사용자 이메일")
    core_editor: Optional[str] = Field(None, description="기본 에디터")
    core_autocrlf: Optional[str] = Field(None, description="줄바꿈 문자 처리 방식")
    core_ignorecase: Optional[bool] = Field(None, description="대소문자 구분 여부")


class GitDiff(BaseModel):
    """Git 변경사항 정보"""

    file_path: str = Field(..., description="파일 경로")
    changes: str = Field(..., description="변경 내용")
    is_binary: bool = Field(..., description="바이너리 파일 여부")
    mode: Optional[str] = Field(None, description="파일 모드")
    similarity_index: Optional[int] = Field(None, description="유사도 지수")


class GitMergeResult(BaseModel):
    """Git 병합 결과 정보"""

    success: bool = Field(..., description="병합 성공 여부")
    conflicts: List[str] = Field(default_factory=list, description="충돌 파일 목록")
    merged_files: List[str] = Field(
        default_factory=list, description="병합된 파일 목록"
    )
    message: Optional[str] = Field(None, description="병합 메시지")
