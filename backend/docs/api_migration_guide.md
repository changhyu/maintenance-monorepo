# API 마이그레이션 가이드

이 문서는 API 버전 간 마이그레이션에 대한 자세한 안내를 제공합니다.

## v1 → v2 마이그레이션 가이드

v2 API로 마이그레이션할 때 고려해야 할 주요 변경 사항과 관련 코드 변환 방법을 설명합니다.

### 1. 새로운 인증 시스템

v2 API는 기존 JWT 인증과 함께 OAuth2 인증을 지원합니다. 이중 인증 옵션을 통해 더 강력한 보안 시스템을 제공합니다.

#### JWT 인증 (v1과 동일, 계속 지원)

```javascript
const loginResponse = await fetch('/api/v1/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const { access_token } = await loginResponse.json();

// API 요청
const response = await fetch('/api/v1/users', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
```

#### OAuth2 인증 (v2 새 기능)

클라이언트 인증 흐름:

```javascript
// 1. 권한 부여 코드 요청
window.location.href = '/api/v2/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code';

// 2. 리디렉션 후 코드로 토큰 요청
const tokenResponse = await fetch('/api/v2/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET',
    redirect_uri: 'YOUR_REDIRECT_URI'
  })
});

const { access_token, refresh_token, expires_in } = await tokenResponse.json();

// 3. 토큰 저장 (만료 시간 포함)
const expiryTime = Date.now() + (expires_in * 1000);
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
localStorage.setItem('token_expiry', expiryTime);

// 4. API 요청
const response = await fetch('/api/v2/users', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
```

리프레시 토큰 사용:

```javascript
// 토큰 만료 확인
const isTokenExpired = () => {
  const expiry = localStorage.getItem('token_expiry');
  return expiry && Date.now() > parseInt(expiry);
};

// 토큰 갱신 함수
const refreshAccessToken = async () => {
  const refresh_token = localStorage.getItem('refresh_token');
  
  const refreshResponse = await fetch('/api/v2/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
      client_id: 'YOUR_CLIENT_ID',
      client_secret: 'YOUR_CLIENT_SECRET'
    })
  });
  
  const { access_token, refresh_token: new_refresh_token, expires_in } = await refreshResponse.json();
  
  // 새 토큰 저장
  const expiryTime = Date.now() + (expires_in * 1000);
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('refresh_token', new_refresh_token);
  localStorage.setItem('token_expiry', expiryTime);
  
  return access_token;
};

// API 요청 래퍼 (토큰 자동 갱신)
const apiRequest = async (url, options = {}) => {
  if (isTokenExpired()) {
    await refreshAccessToken();
  }
  
  const access_token = localStorage.getItem('access_token');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${access_token}`
    }
  });
};
```

### 2. 응답 형식 변경

v2 API는 HATEOAS 원칙을 따르는 하이퍼미디어 링크가 포함된 응답을 반환합니다.

#### v1 응답 형식

```json
[
  {
    "id": 1,
    "name": "User 1",
    "email": "user1@example.com"
  },
  {
    "id": 2,
    "name": "User 2",
    "email": "user2@example.com"
  }
]
```

#### v2 응답 형식

```json
{
  "_embedded": {
    "users": [
      {
        "id": 1,
        "name": "User 1",
        "email": "user1@example.com",
        "_links": {
          "self": { "href": "/api/v2/users/1" },
          "edit": { "href": "/api/v2/users/1" },
          "delete": { "href": "/api/v2/users/1" }
        }
      },
      {
        "id": 2,
        "name": "User 2",
        "email": "user2@example.com",
        "_links": {
          "self": { "href": "/api/v2/users/2" },
          "edit": { "href": "/api/v2/users/2" },
          "delete": { "href": "/api/v2/users/2" }
        }
      }
    ]
  },
  "_links": {
    "self": { "href": "/api/v2/users?page=1&size=10" },
    "next": { "href": "/api/v2/users?page=2&size=10" },
    "first": { "href": "/api/v2/users?page=1&size=10" },
    "last": { "href": "/api/v2/users?page=5&size=10" }
  },
  "page": {
    "size": 10,
    "totalElements": 42,
    "totalPages": 5,
    "number": 1
  }
}
```

#### 데이터 접근 방법 변경

v1 데이터 접근:
```javascript
const response = await fetch('/api/v1/users');
const users = await response.json();

// 데이터 사용
users.forEach(user => {
  console.log(user.name);
});
```

v2 데이터 접근:
```javascript
const response = await fetch('/api/v2/users');
const data = await response.json();

// 데이터 추출
const users = data._embedded.users;

// 데이터 사용
users.forEach(user => {
  console.log(user.name);
  
  // 링크 사용 예시
  const userDetailUrl = user._links.self.href;
  const editUrl = user._links.edit.href;
});

// 페이지네이션 링크 사용
if (data._links.next) {
  const nextPageUrl = data._links.next.href;
  // 다음 페이지 로드
}
```

### 3. 페이지네이션 변경

v2 API는 기존의 페이지 기반 페이지네이션과 함께 커서 기반 페이지네이션을 지원합니다.

#### 페이지 기반 페이지네이션 (v1과 호환)

```javascript
// 페이지 기반 요청
const response = await fetch('/api/v1/users?page=2&size=10');
const data = await response.json();
```

#### 커서 기반 페이지네이션 (v2 신규)

```javascript
// 첫 페이지 요청
let response = await fetch('/api/v2/users?limit=10');
let data = await response.json();

// 다음 페이지 요청 (마지막 항목의 ID 사용)
const lastUser = data._embedded.users[data._embedded.users.length - 1];
response = await fetch(`/api/v2/users?after=${lastUser.id}&limit=10`);
data = await response.json();

// 이전 페이지 요청
const firstUser = data._embedded.users[0];
response = await fetch(`/api/v2/users?before=${firstUser.id}&limit=10`);
data = await response.json();
```

### 4. 새로운 기능: 일괄 처리 작업

v2 API는 대량의 리소스를 효율적으로 처리하기 위한 일괄 처리 엔드포인트를 제공합니다.

#### 일괄 생성

```javascript
const newUsers = [
  { name: "User 1", email: "user1@example.com" },
  { name: "User 2", email: "user2@example.com" },
  { name: "User 3", email: "user3@example.com" }
];

const response = await fetch('/api/v2/users/batch', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify(newUsers)
});

const result = await response.json();
// result.created: 생성된 항목 수
// result.items: 생성된 항목 목록
```

#### 일괄 업데이트

```javascript
const updates = [
  { id: 1, name: "Updated User 1" },
  { id: 2, email: "updated2@example.com" },
  { id: 3, name: "Updated User 3", email: "updated3@example.com" }
];

const response = await fetch('/api/v2/users/batch', {
  method: 'PATCH',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify(updates)
});

const result = await response.json();
// result.updated: 업데이트된 항목 수
// result.items: 업데이트된 항목 목록
```

#### 일괄 삭제

```javascript
const idsToDelete = [1, 2, 3, 4, 5];

const response = await fetch('/api/v2/users/batch', {
  method: 'DELETE',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({ ids: idsToDelete })
});

const result = await response.json();
// result.deleted: 삭제된 항목 수
// result.failed: 삭제 실패한 항목 ID 목록
```

### 5. 오류 응답 형식 변경

v2 API는 보다 상세한 오류 정보를 제공합니다.

#### v1 오류 응답

```json
{
  "detail": "사용자를 찾을 수 없습니다"
}
```

#### v2 오류 응답

```json
{
  "status": 404,
  "code": "USER_NOT_FOUND",
  "message": "사용자를 찾을 수 없습니다",
  "detail": "ID가 123인 사용자가 존재하지 않습니다",
  "timestamp": "2025-05-02T14:30:00Z",
  "path": "/api/v2/users/123",
  "suggested_actions": [
    "유효한 사용자 ID를 사용하세요",
    "사용자 목록을 조회하려면 /api/v2/users를 사용하세요"
  ]
}
```

#### 오류 처리 방법 변경

v1 오류 처리:
```javascript
try {
  const response = await fetch('/api/v1/users/123');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }
  const user = await response.json();
} catch (error) {
  console.error('오류 발생:', error.message);
}
```

v2 오류 처리:
```javascript
try {
  const response = await fetch('/api/v2/users/123');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.code}: ${error.message} - ${error.detail}`);
  }
  const user = await response.json();
} catch (error) {
  console.error('오류 발생:', error.message);
  
  // 오류 코드별 처리
  if (error.message.includes('USER_NOT_FOUND')) {
    // 사용자를 찾을 수 없는 경우의 처리
  } else if (error.message.includes('VALIDATION_FAILED')) {
    // 유효성 검사 실패 처리
  }
}
```

## 단계별 마이그레이션 전략

v1에서 v2로 부드럽게 마이그레이션하는 단계별 접근 방식을 제안합니다:

1. **API 클라이언트 래퍼 도입**
   - API 호출을 추상화하는 래퍼 클래스/함수 도입
   - 버전 간 차이를 내부적으로 처리

2. **점진적 전환**
   - 새로운 기능은 v2 API 사용
   - 기존 기능은 점진적으로 v2로 마이그레이션

3. **병행 운영**
   - 마이그레이션 중에는 v1과 v2 API를 병행하여 사용
   - 리스크가 낮은 기능부터 단계적으로 마이그레이션

4. **모니터링 및 검증**
   - 마이그레이션 과정에서 오류 모니터링 강화
   - 성능 메트릭 비교하여 영향 평가

5. **최종 전환**
   - 모든 기능이 v2로 마이그레이션된 후 v1 사용 중단
   - 충분한 공지 기간 후 v1 지원 종료

## API 호환성 보장

v2 API는 다음과 같은 방법으로 v1 API와의 호환성을 보장합니다:

1. v1 엔드포인트는 계속 지원됩니다 (최소 12개월).
2. v1 형식의 요청 및 응답은 v2 API에서도 계속 지원됩니다.
3. v2에서 사용 중단된 기능은 명확한 경고 메시지와 함께 제공됩니다.
4. v1에서 v2로의 자동 리디렉션을 지원합니다 (요청 헤더에 따라).

## 테스트 및 검증

마이그레이션 중 다음 테스트를 수행하는 것이 좋습니다:

1. **기능 테스트**: 모든 기능이 새 API 버전에서도 동일하게 작동하는지 확인
2. **성능 테스트**: 새 API 버전이 동일하거나 더 나은 성능을 제공하는지 확인
3. **복원력 테스트**: 오류 시나리오에서 적절하게 처리되는지 확인
4. **보안 테스트**: 새로운 인증 시스템이 보안 요구사항을 충족하는지 확인

## 지원 및 문의

마이그레이션 과정에서 문제가 발생하거나 질문이 있는 경우:

- 개발자 포럼: https://example.com/developer-forum
- API 지원 이메일: api-support@example.com
- API 문서: https://example.com/api-docs