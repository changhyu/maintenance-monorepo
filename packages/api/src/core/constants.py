"""
애플리케이션 전역에서 사용되는 상수 정의
"""

# 캐시 관련 상수 (초 단위)
CACHE_TTL = {
    "default": 300,  # 5분
    "shop": 600,     # 10분
    "vehicle": 600,  # 10분
    "maintenance": 300,  # 5분
    "user": 1800,    # 30분
    "analytics": 3600,  # 1시간
    "static": 86400,  # 1일
    "settings": 3600,  # 1시간
    "search": 120,   # 2분
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
ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"]

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