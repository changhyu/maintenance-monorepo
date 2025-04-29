# API 속도 제한(Rate Limiting) 모듈

이 모듈은 Git 관련 API 요청에 대한 속도 제한 기능을 제공합니다.

## 주요 기능

- API 요청에 대한 속도 제한 적용
- 토큰 버킷 알고리즘 사용
- 사용자/IP 기반 식별
- 관리자와 일반 사용자 차등 제한
- API 엔드포인트별 차등 제한

## 사용 방법

### 기본 설정

```python
from fastapi import FastAPI
from gitmanager.security.rate_limit import RateLimitMiddleware, RateLimiter
from gitmanager.security.rate_limit.storage import InMemoryStorage

app = FastAPI()

# 기본 설정으로 미들웨어 추가
app.add_middleware(
    RateLimitMiddleware,
    rate_limiter=RateLimiter(
        storage=InMemoryStorage(),
        default_limit=60,       # 기본 분당 60 요청
        default_window=60,      # 60초(1분) 윈도우
        admin_limit_multiplier=5.0  # 관리자는 5배 높은 제한
    ),
    excluded_paths=["/api/health", "/docs"],  # 제외 경로
    admin_paths=["/api/admin"]  # 관리자 경로
)
```

### Redis 스토리지 사용

```python
from redis import Redis
from gitmanager.security.rate_limit.storage import RedisStorage

redis_client = Redis(host="localhost", port=6379, db=0)
storage = RedisStorage(redis_client=redis_client)

rate_limiter = RateLimiter(storage=storage)
```

### 환경 변수 설정

다음 환경 변수를 사용하여 설정을 변경할 수 있습니다:

- `RATE_LIMIT_ENABLED`: 속도 제한 활성화 여부 (기본: "true")
- `RATE_LIMIT_DEFAULT`: 기본 분당 요청 제한 (기본: "60")
- `RATE_LIMIT_WINDOW`: 기본 시간 윈도우(초) (기본: "60")
- `RATE_LIMIT_ADMIN_MULTIPLIER`: 관리자 제한 승수 (기본: "5.0")
- `RATE_LIMIT_EXCLUDED_PATHS`: 제외 경로 목록 (쉼표로 구분)
- `RATE_LIMIT_GIT_STATUS`: git_status 엔드포인트 제한 (기본: "60")
- `RATE_LIMIT_GIT_COMMIT`: git_commit 엔드포인트 제한 (기본: "10")
- `USE_REDIS_RATE_LIMIT`: Redis 스토리지 사용 여부 (기본: "false")

## 엔드포인트별 기본 제한

| 엔드포인트 | 일반 사용자 제한 | 관리자 제한 |
| ---------- | ---------------: | ----------: |
| git_status |            60/분 |      300/분 |
| git_commit |            10/분 |       50/분 |
| git_push   |             5/분 |       25/분 |
| git_pull   |             5/분 |       25/분 |
| git_merge  |             5/분 |       25/분 |
| git_branch |            20/분 |      100/분 |
| 기타       |            60/분 |      300/분 |

## 응답 헤더

속도 제한 미들웨어는 다음 응답 헤더를 추가합니다:

- `X-RateLimit-Limit`: 분당 최대 요청 수
- `X-RateLimit-Remaining`: 현재 기간 내 남은 요청 수
- `X-RateLimit-Reset`: 제한 초기화 시간(UNIX 타임스탬프)
- `Retry-After`: 초과 시 재시도 가능한 시간(초) (429 응답에만 포함)

## 응답 형식 (429 상태 코드)

```json
{
  "success": false,
  "message": "요청 횟수가 너무 많습니다. 잠시 후 다시 시도하세요.",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 58
}
```
