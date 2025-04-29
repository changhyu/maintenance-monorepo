# API 마이그레이션 가이드

이 문서는 기존 API에서 새로운 통합 API로 마이그레이션하는 과정을 안내합니다.

## 변경 내용 개요

백엔드 API 구조가 다음과 같이 변경되었습니다:

1. **Git API 통합**: 기존의 별도 Git API들이 하나의 통합된 API로 병합되었습니다.
2. **표준화된 응답 형식**: 모든 API 응답이 일관된 형식으로 표준화되었습니다.
3. **쓰기 작업 추가**: Git API에 다양한 쓰기 작업(커밋, 브랜치 생성 등)이 추가되었습니다.
4. **Git 작업 로깅**: 모든 Git 작업이 데이터베이스에 기록되어 추적 및 감사가 가능합니다.
5. **차량 정비 API 통합**: 차량 정비 API가 메인 백엔드 API에 통합되었습니다.
6. **API 버전 관리**: 명확한 API 버전 관리 구조가 도입되었습니다.
7. **문서화 개선**: API 문서가 개선되었으며, 예제 응답이 추가되었습니다.
8. **비동기 데이터베이스 지원**: 데이터베이스 작업이 비동기 방식으로 처리됩니다.

## Git API 마이그레이션

### 기존 Git API

기존에는 다음과 같은 두 개의 분리된 Git API가 있었습니다:

1. `/api/v1/git/...` (backend/api/v1/endpoints/git.py)
2. `/api/git/...` (backend/routes/api_git.py)

### 통합된 Git API

모든 Git API가 `/api/v1/git/...` 엔드포인트로 통합되었습니다 (backend/api/v1/endpoints/git_unified.py).

#### 표준화된 응답 형식

모든 API 응답은 다음과 같은 표준 형식으로 통일되었습니다:

```json
{
  "success": true,                 // 요청 성공 여부
  "message": "작업 성공 메시지",    // 사용자 친화적인 메시지
  "data": { ... },                // 실제 데이터 (성공 시)
  "errors": [ ... ],              // 오류 정보 (실패 시)
  "timestamp": "2023-06-15T12:34:56.789Z", // 응답 생성 시간
  "version": "1.0.0"              // API 버전
}
```

#### 변경된 엔드포인트 매핑 (읽기 작업)

| 기존 엔드포인트 | 새 엔드포인트 | 설명 |
|---------------|-------------|------|
| `/api/git/status` | `/api/v1/git/status` | Git 서비스 상태 확인 |
| `/api/git/branches` | `/api/v1/git/branches` | Git 브랜치 목록 조회 |
| `/api/git/commits` | `/api/v1/git/commits` | Git 커밋 이력 조회 |
| `/api/git/diff` | `/api/v1/git/diff` | 특정 파일의 변경 내역 조회 |
| `/api/git/file-history` | `/api/v1/git/file-history` | 특정 파일의 변경 이력 조회 |
| 없음 | `/api/v1/git/repo-status` | Git 저장소 상태 상세 조회 |
| 없음 | `/api/v1/git/tags` | Git 태그 목록 조회 |
| 없음 | `/api/v1/git/config` | Git 설정 조회 (관리자 권한 필요) |
| 없음 | `/api/v1/git/summary` | Git 저장소 요약 정보 조회 |

#### 추가된 엔드포인트 (쓰기 작업)

| 새 엔드포인트 | HTTP 메서드 | 설명 | 필요 권한 |
|--------------|---------|------|---------|
| `/api/v1/git/add` | POST | 파일 스테이징 (git add) | git:write |
| `/api/v1/git/commit` | POST | 변경사항 커밋 (git commit) | git:write |
| `/api/v1/git/reset` | POST | 스테이징 취소 (git reset) | git:write |
| `/api/v1/git/branch` | POST | 브랜치 생성 (git branch) | git:write |
| `/api/v1/git/checkout` | POST | 브랜치 전환 (git checkout) | git:write |
| `/api/v1/git/pull` | POST | 원격 저장소에서 변경사항 가져오기 (git pull) | git:write |
| `/api/v1/git/push` | POST | 원격 저장소로 변경사항 푸시하기 (git push) | git:write |

#### 새로 추가된 Git 작업 로그 기능

Git 작업 로깅 기능이 추가되어 모든 Git 작업이 데이터베이스에 기록됩니다. 이를 통해 다음과 같은 이점이 있습니다:

- 변경 이력 추적 및 감사
- 작업 성공/실패 통계
- 사용자별 Git 작업 분석

관리자는 새로 추가된 `/api/v1/git/logs` 엔드포인트를 통해 로그를 조회할 수 있습니다:

| 새 엔드포인트 | HTTP 메서드 | 설명 | 필요 권한 |
|--------------|---------|------|---------|
| `/api/v1/git/logs` | GET | Git 작업 로그 목록 조회 | admin:read |

로그 조회 시 다음과 같은 필터링 옵션을 사용할 수 있습니다:

- `limit`: 반환할 최대 로그 수 (기본값: 20, 최대: 100)
- `skip`: 건너뛸 로그 수 (페이지네이션용)
- `operation_type`: 작업 유형별 필터링 (commit, add, branch_create 등)

### 마이그레이션 단계

1. 기존 API 호출을 새 엔드포인트로 변경합니다.
2. 새로운 인증 방식(Bearer 토큰)이 모든 API에 적용되었으므로, 인증 방식을 업데이트합니다.
3. 응답 형식이 표준화되었으므로, 클라이언트 코드를 새 응답 형식에 맞게 조정합니다.

### 코드 예제

#### 기존 코드 (읽기 작업)

```javascript
// Git 커밋 이력 조회
async function getCommits() {
  const response = await fetch('/api/git/commits?limit=10');
  return response.json();
}
```

#### 새 코드 (읽기 작업)

```javascript
// Git 커밋 이력 조회
async function getCommits() {
  const response = await fetch('/api/v1/git/commits?limit=10', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  // 표준화된 응답 형식 사용
  if (result.success) {
    return result.data.commits;
  } else {
    throw new Error(result.message || '커밋 이력 조회 실패');
  }
}
```

#### 새 코드 (쓰기 작업)

```javascript
// Git 파일 스테이징
async function stageFiles(files) {
  const response = await fetch('/api/v1/git/add', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ files })
  });
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || '파일 스테이징 실패');
  }
  
  return result.data;
}

// Git 커밋 생성
async function createCommit(message) {
  const response = await fetch('/api/v1/git/commit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || '커밋 생성 실패');
  }
  
  return result.data;
}
```

#### Git 작업 로그 조회 예제

```javascript
// Git 작업 로그 조회 (관리자 전용)
async function getGitOperationLogs(limit = 20, skip = 0, operationType = null) {
  let url = `/api/v1/git/logs?limit=${limit}&skip=${skip}`;
  if (operationType) {
    url += `&operation_type=${operationType}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || 'Git 작업 로그 조회 실패');
  }
  
  return result.data;
}
```

## 데이터베이스 마이그레이션

새로운 Git 작업 로그 기능을 위해 데이터베이스 스키마가 변경되었습니다. 다음 커맨드를 실행하여 마이그레이션을 적용해야 합니다:

```bash
# Git 작업 로그 테이블 생성
python -m backend.migrations.run_migrations up --script create_git_operation_logs
```

마이그레이션을 롤백해야 하는 경우:

```bash
# Git 작업 로그 테이블 삭제
python -m backend.migrations.run_migrations down --script create_git_operation_logs
```

## 차량 정비 API 마이그레이션

### 기존 차량 정비 API

기존에는 `/packages/api/basic_api.py`에서 제공하던 API를 사용했습니다.

### 통합된 차량 정비 API

차량 정비 API가 메인 백엔드에 통합되어 `/api/v1/maintenance/...` 경로로 제공됩니다.

#### 변경된 엔드포인트 매핑

| 기존 엔드포인트 | 새 엔드포인트 | 설명 |
|---------------|-------------|------|
| `/api/vehicles` | `/api/v1/maintenance/vehicles` | 차량 목록 조회 |
| `/api/vehicles/{id}` | `/api/v1/maintenance/vehicles/{id}` | 특정 차량 정보 조회 |
| `/api/maintenance-records` | `/api/v1/maintenance/records` | 정비 기록 목록 조회 |
| `/api/maintenance-records/{id}` | `/api/v1/maintenance/records/{id}` | 특정 정비 기록 조회 |

### 마이그레이션 단계

1. 기존 API 호출을 새 엔드포인트로 변경합니다.
2. 새롭게 표준화된 인증 방식을 적용합니다.
3. 표준화된 응답 형식에 맞게 클라이언트 코드를 조정합니다.

## API 버전 관리

새로운 API 버전 관리 시스템이 도입되었습니다. 모든 API 응답에는 `API-Version` 헤더가 포함됩니다.

### 버전 정보 확인

API 버전 정보를 확인하려면 다음 엔드포인트를 사용하세요:

- 모든 버전 정보 조회: `/api/versions`
- 특정 버전 정보 조회: `/api/versions/{version_name}` (예: `/api/versions/v1`)

### 버전 종료 예정(Deprecation) 알림

API 버전이 지원 종료 예정인 경우, 응답 헤더에 `Warning` 헤더가 포함됩니다.

## 오류 처리

새로운 표준화된 오류 처리 방식이 적용되었습니다. 모든 오류 응답은 다음과 같은 형식으로 반환됩니다:

```json
{
  "success": false,
  "message": "오류 메시지",
  "errors": [
    {
      "detail": "오류에 대한 상세 설명"
    }
  ],
  "timestamp": "2023-06-15T12:34:56.789Z",
  "version": "1.0.0"
}
```

주요 HTTP 상태 코드:

- 400: 잘못된 요청 (Bad Request)
- 401: 인증 실패 (Unauthorized)
- 403: 권한 부족 (Forbidden)
- 404: 리소스를 찾을 수 없음 (Not Found)
- 409: 리소스 충돌 (Conflict)
- 422: 유효성 검사 실패 (Unprocessable Entity)
- 500: 서버 내부 오류 (Internal Server Error)
- 503: 서비스 이용 불가 (Service Unavailable)

## 문서화 및 테스트

### 향상된 API 문서

API 문서가 크게 개선되었습니다:

- Swagger UI: `/docs`
- ReDoc: `/redoc`

### 자동 테스트

API 엔드포인트에 대한 단위 테스트가 추가되었습니다. 테스트를 실행하려면:

```bash
cd /path/to/maintenance-monorepo
pytest backend/tests/api
```

## 권한 체계

모든 API는 다음과 같은 권한 체계를 따릅니다:

- `admin:read`: 관리자 읽기 권한
- `admin:write`: 관리자 쓰기 권한
- `git:read`: Git 리소스 읽기 권한
- `git:write`: Git 리소스 쓰기 권한
- `user:read`: 사용자 정보 읽기 권한
- `user:write`: 사용자 정보 쓰기 권한

## 역할 및 권한

다음과 같은 기본 역할이 제공됩니다:

1. **Admin**: 모든 권한 보유
2. **User**: 기본 사용자 권한 (사용자 정보 읽기, 정비 기록 읽기, Git 읽기)
3. **GitManager**: Git 관련 권한 (Git 읽기/쓰기, 사용자 정보 읽기)

## 마이그레이션 일정

1. **현재 단계**: 두 가지 API 버전이 병렬로 지원됩니다.
2. **3개월 후**: 기존 API는 지원 종료 예정(deprecated)으로 표시됩니다.
3. **6개월 후**: 기존 API 지원이 중단됩니다.

## 지원 및 문의

마이그레이션 중 문제가 발생하면 <development@example.com>으로 문의하세요.
