"""
애플리케이션 전역에서 사용되는 상수 정의
"""

# 캐시 관련 상수 (초 단위)
CACHE_TTL = {
    "default": 300,  # 5분
    "shop": 600,  # 10분
    "vehicle": 600,  # 10분
    "maintenance": 300,  # 5분
    "user": 1800,  # 30분
    "analytics": 3600,  # 1시간
    "static": 86400,  # 1일
    "settings": 3600,  # 1시간
    "search": 120,  # 2분
}

# 파일 크기 제한 (바이트 단위)
FILE_SIZE_LIMITS = {
    "image": 10 * 1024 * 1024,  # 10MB
    "document": 20 * 1024 * 1024,  # 20MB
    "report": 50 * 1024 * 1024,  # 50MB
    "attachment": 100 * 1024 * 1024,  # 100MB
    "avatar": 5 * 1024 * 1024,  # 5MB
}

# API 응답 관련 상수
API_RESPONSES = {
    "success": "요청이 성공적으로 처리되었습니다",
    "error": "요청 처리 중 오류가 발생했습니다",
    "not_found": "요청한 리소스를 찾을 수 없습니다",
    "validation_error": "입력값 유효성 검증에 실패했습니다",
    "unauthorized": "인증이 필요합니다",
    "forbidden": "접근 권한이 없습니다",
}

# 페이지네이션 관련 상수
PAGINATION = {
    "default_limit": 100,
    "max_limit": 1000,
}

# 이미지 파일 허용 확장자
ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

# 문서 파일 허용 확장자
ALLOWED_DOCUMENT_EXTENSIONS = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
]

# 기본 정렬 기준
DEFAULT_SORT = {
    "created_at": "desc",
}

# 검색 제한 설정
SEARCH_LIMITS = {
    "min_query_length": 2,
    "max_query_length": 50,
}

# 기타 일반 상수
DEFAULT_LANGUAGE = "ko"
DEFAULT_PAGINATION_PAGE = 1
MAX_RETRY_COUNT = 3

"""
Git 관련 상수들을 정의하는 모듈
"""

# Git 명령어 관련 상수
GIT_COMMAND = "git"
GIT_INIT = "init"
GIT_CLONE = "clone"
GIT_ADD = "add"
GIT_COMMIT = "commit"
GIT_PUSH = "push"
GIT_PULL = "pull"
GIT_FETCH = "fetch"
GIT_MERGE = "merge"
GIT_REBASE = "rebase"
GIT_CHECKOUT = "checkout"
GIT_BRANCH = "branch"
GIT_TAG = "tag"
GIT_LOG = "log"
GIT_STATUS = "status"
GIT_DIFF = "diff"
GIT_SHOW = "show"
GIT_CONFIG = "config"
GIT_REMOTE = "remote"
GIT_COMMAND_TIMEOUT = 30  # Git 명령어 실행 제한 시간 (초)
GIT_COMMAND_RETRY_COUNT = 3  # Git 명령어 재시도 횟수
GIT_COMMAND_RETRY_DELAY = 1  # Git 명령어 재시도 간격 (초)

# Git 상태 관련 상수
GIT_STATUS_CLEAN = "clean"  # 깨끗한 상태
GIT_STATUS_MODIFIED = "modified"  # 수정된 상태
GIT_STATUS_UNTRACKED = "untracked"  # 추적되지 않은 상태
GIT_STATUS_CONFLICT = "conflict"  # 충돌 상태
GIT_STATUS_STAGED = "staged"  # 스테이징된 상태

# Git 브랜치 관련 상수
DEFAULT_BRANCH = "main"  # 기본 브랜치 이름
DEFAULT_BRANCH_MAIN = "main"  # 메인 브랜치 이름
DEFAULT_BRANCH_MASTER = "master"  # 마스터 브랜치 이름
DEFAULT_BRANCH_DEVELOP = "develop"  # 개발 브랜치 이름
MASTER_BRANCH = "master"
DEVELOP_BRANCH = "develop"
FEATURE_PREFIX = "feature/"
BUGFIX_PREFIX = "bugfix/"
HOTFIX_PREFIX = "hotfix/"
RELEASE_PREFIX = "release/"

# Git 원격 저장소 관련 상수
DEFAULT_REMOTE_NAME = "origin"  # 기본 원격 저장소 이름
DEFAULT_REMOTE_URL = ""  # 기본 원격 저장소 URL
UPSTREAM_REMOTE = "upstream"  # 업스트림 원격 저장소

# Git 태그 관련 상수
DEFAULT_TAG_PREFIX = "v"  # 기본 태그 접두사
DEFAULT_TAG_SEPARATOR = "-"  # 태그 구분자
LIGHTWEIGHT_TAG = "lightweight"  # 경량 태그
ANNOTATED_TAG = "annotated"  # 주석 태그

# Git 설정 관련 상수
CONFIG_USER_NAME = "user.name"
CONFIG_USER_EMAIL = "user.email"
CONFIG_CORE_EDITOR = "core.editor"
CONFIG_CORE_AUTOCRLF = "core.autocrlf"
CONFIG_CORE_IGNORECASE = "core.ignorecase"
CONFIG_REMOTE_ORIGIN_URL = "remote.origin.url"
CONFIG_BRANCH_MAIN_NAME = "branch.main.name"
DEFAULT_GIT_USER_NAME = "Git User"  # 기본 사용자 이름
DEFAULT_GIT_USER_EMAIL = "git@example.com"  # 기본 사용자 이메일

# Git 에러 메시지 관련 상수
ERROR_GIT_NOT_INSTALLED = "Git이 설치되어 있지 않습니다."
ERROR_NOT_GIT_REPOSITORY = "Git 저장소가 아닙니다."
ERROR_GIT_COMMAND_FAILED = "Git 명령어 실행에 실패했습니다."
ERROR_GIT_AUTHENTICATION = "Git 인증에 실패했습니다."
ERROR_GIT_REMOTE = "원격 저장소 작업 중 오류가 발생했습니다."
ERROR_GIT_CONFIG = "Git 설정 작업 중 오류가 발생했습니다."
ERROR_GIT_MERGE = "병합 작업 중 오류가 발생했습니다."
ERROR_GIT_BRANCH = "브랜치 작업 중 오류가 발생했습니다."
ERROR_GIT_TAG = "태그 작업 중 오류가 발생했습니다."

# Git 에러 메시지 관련 상수 (새 이름)
ERROR_MESSAGE_GIT_NOT_INSTALLED = ERROR_GIT_NOT_INSTALLED
ERROR_MESSAGE_NOT_GIT_REPOSITORY = ERROR_NOT_GIT_REPOSITORY
ERROR_MESSAGE_GIT_COMMAND_FAILED = ERROR_GIT_COMMAND_FAILED
ERROR_MESSAGE_GIT_AUTHENTICATION_FAILED = ERROR_GIT_AUTHENTICATION
ERROR_MESSAGE_GIT_CONFLICT = "병합 충돌이 발생했습니다."
ERROR_MESSAGE_GIT_MERGE_FAILED = ERROR_GIT_MERGE
ERROR_MESSAGE_GIT_PUSH_FAILED = "푸시에 실패했습니다."
ERROR_MESSAGE_GIT_PULL_FAILED = "풀에 실패했습니다."
ERROR_MESSAGE_GIT_BRANCH_NOT_FOUND = ERROR_GIT_BRANCH
ERROR_MESSAGE_GIT_TAG_NOT_FOUND = ERROR_GIT_TAG
ERROR_MESSAGE_GIT_COMMIT_NOT_FOUND = "커밋을 찾을 수 없습니다."
ERROR_MESSAGE_GIT_FILE_NOT_FOUND = "파일을 찾을 수 없습니다."
ERROR_MESSAGE_GIT_REMOTE_NOT_FOUND = ERROR_GIT_REMOTE
ERROR_MESSAGE_GIT_CONFIG_NOT_FOUND = ERROR_GIT_CONFIG

# Git 성공 메시지 관련 상수
SUCCESS_GIT_COMMAND = "Git 명령어가 성공적으로 실행되었습니다."
SUCCESS_GIT_COMMIT = "커밋이 성공적으로 생성되었습니다."
SUCCESS_GIT_PUSH = "변경사항이 성공적으로 푸시되었습니다."
SUCCESS_GIT_PULL = "변경사항이 성공적으로 풀되었습니다."
SUCCESS_GIT_MERGE = "병합이 성공적으로 완료되었습니다."
SUCCESS_GIT_BRANCH = "브랜치 작업이 성공적으로 완료되었습니다."
SUCCESS_GIT_TAG = "태그 작업이 성공적으로 완료되었습니다."
