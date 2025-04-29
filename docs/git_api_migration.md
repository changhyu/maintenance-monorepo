# Git API 마이그레이션 가이드

## 개요

본 문서는 Git API의 레거시 엔드포인트에서 새로운 통합 API 엔드포인트로의 마이그레이션을 위한 가이드를 제공합니다.

## 관련 마이그레이션 가이드

- [Git Service Python API 마이그레이션 가이드](/docs/git_service_python_api.md) - GitService 클래스의 Python API 사용 방법 및 향후 변경 계획

## 마이그레이션 배경

기존에는 다양한 경로에서 Git 관련 API가 제공되었으나, 유지보수와 일관성을 위해 하나의 통합된 API 엔드포인트로 정리하였습니다. 이 가이드는 개발자가 원활하게 새로운 API를 사용할 수 있도록 도움을 주기 위해 작성되었습니다.

## 버전 정보

- **현재 API 버전**: 1.1.0
- **마지막 업데이트**: 2023-12-15

## 레거시 엔드포인트 지원 중단 계획

레거시 Git API 엔드포인트(`/api/v1/git/*` 및 `/api/v1/git-legacy/*`)는 당분간 이전 버전 호환성을 위해 유지되지만, 2024년 6월 이후 제거될 예정입니다. 모든 개발자는 **새로운 통합 API 엔드포인트(`/api/v1/git`)로 마이그레이션**하는 것을 강력히 권장합니다.

## 엔드포인트 매핑

아래 표는 레거시 엔드포인트와 새로운 통합 엔드포인트 간의 매핑을 보여줍니다.

| 레거시 엔드포인트 | 새로운 통합 엔드포인트 | 설명 |
|----------------|----------------------|------|
| `/api/v1/git/branches` | `/api/v1/git/branches` | Git 브랜치 목록 조회 |
| `/api/v1/git/status` | `/api/v1/git/repo-status` | Git 저장소 상태 조회 |
| `/api/v1/git/commits` | `/api/v1/git/commits` | Git 커밋 이력 조회 |
| `/api/v1/git/tags` | `/api/v1/git/tags` | Git 태그 목록 조회 |
| `/api/v1/git/diff` | `/api/v1/git/diff` | Git 파일 변경 내역 조회 |
| `/api/v1/git/file-history` | `/api/v1/git/file-history` | Git 파일 변경 이력 조회 |

## 주요 변경 사항

1. **표준화된 응답 형식**:

   ```json
   {
     "success": true,
     "message": "작업 성공 메시지",
     "data": {
       // 응답 데이터
     },
     "timestamp": "2023-12-15T12:00:00.000Z",
     "version": "1.1.0"
   }
   ```

2. **에러 응답 개선**:

   ```json
   {
     "success": false,
     "message": "오류 메시지",
     "errors": [
       {
         "code": "GIT-003",
         "message": "구체적인 오류 내용",
         "details": {
           // 추가 오류 세부 정보
         }
       }
     ],
     "timestamp": "2023-12-15T12:00:00.000Z",
     "version": "1.1.0"
   }
   ```

3. **새로운 기능 추가**:
   - 캐싱 메커니즘 (`use_cache` 쿼리 파라미터 지원)
   - 페이지네이션 개선 (`limit`, `skip` 파라미터)
   - 작업 로그 기록 (감사 및 추적 목적)

## 마이그레이션 방법

1. **엔드포인트 URL 업데이트**:
   - 레거시 엔드포인트를 사용하는 모든 코드를 찾아 위 매핑 테이블에 따라 새 엔드포인트로 업데이트하세요.

2. **응답 처리 업데이트**:
   - 새로운 표준화된 응답 형식에 맞게 클라이언트 코드를 수정하세요.
   - 데이터는 항상 `response.data` 객체 내에 있습니다.
   - 성공 여부는 `response.success` 필드로 확인합니다.

3. **에러 처리 업데이트**:
   - 에러는 `response.errors` 배열에서 찾을 수 있습니다.
   - 각 에러는 `code`, `message`, `details` 필드를 포함합니다.

## 코드 예제

### JavaScript (Axios)

```javascript
// 레거시 코드
axios.get('/api/v1/git/status')
  .then(response => {
    const status = response.data;
    console.log('Git 상태:', status);
  })
  .catch(error => {
    console.error('오류 발생:', error);
  });

// 새로운 코드
axios.get('/api/v1/git/repo-status')
  .then(response => {
    if (response.data.success) {
      const status = response.data.data;
      console.log('Git 상태:', status);
    } else {
      console.error('오류 발생:', response.data.errors);
    }
  })
  .catch(error => {
    console.error('오류 발생:', error);
  });
```

### Python (Requests)

```python
# 레거시 코드
import requests

response = requests.get('/api/v1/git/commits')
if response.status_code == 200:
    commits = response.json()
    print('Git 커밋:', commits)
else:
    print('오류 발생:', response.text)

# 새로운 코드
import requests

response = requests.get('/api/v1/git/commits')
data = response.json()
if response.status_code == 200 and data.get('success'):
    commits = data['data']['commits']
    print('Git 커밋:', commits)
else:
    errors = data.get('errors', [])
    error_messages = [error.get('message') for error in errors]
    print('오류 발생:', error_messages)
```

## 도움이 필요하신가요?

마이그레이션 과정에서 문제가 발생하거나 추가 도움이 필요한 경우 다음 방법으로 지원을 받을 수 있습니다:

- 깃허브 이슈 생성: [GitHub 이슈](https://github.com/example/maintenance-monorepo/issues)
- 개발팀 이메일: [dev@example.com](mailto:dev@example.com)

## 추가 리소스

- [API 전체 문서](/docs/api_docs.md)
- [Git API 전체 엔드포인트 목록](/docs/git_api_endpoints.md)
- [에러 코드 목록](/docs/error_codes.md)
