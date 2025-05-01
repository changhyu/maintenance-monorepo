# API 버전 변경 로그

이 문서는 API 버전 간의 변경 사항을 추적하고 하위 호환성 영향 및 마이그레이션 가이드를 제공합니다.

## 버전 개요

| 버전   | 출시일        | 지원 상태    | 지원 종료 예정일 | 주요 변경 사항                         |
|--------|--------------|--------------|-----------------|--------------------------------------|
| v1     | 2025-05-01   | 활성화        | 2027-05-01      | 최초 API 릴리스                        |
| v2     | 미정          | 개발 중       | -               | 향상된 인증 및 새로운 차량 관리 기능      |

## v1 (현재 버전)

**출시일**: 2025년 5월 1일  
**상태**: 활성화  
**지원 종료 예정일**: 2027년 5월 1일

### 주요 기능

* 사용자 관리 (생성, 조회, 수정, 삭제)
* 역할 및 권한 관리
* 차량 정비 관리
* Git 저장소 관리
* 렌터카 업체 관리

### API 엔드포인트

* `/api/v1/users` - 사용자 관리
* `/api/v1/roles` - 역할 관리
* `/api/v1/permissions` - 권한 관리
* `/api/v1/maintenance` - 차량 정비 관리
* `/api/v1/git` - Git 저장소 관리
* `/api/v1/rental` - 렌터카 업체 관리

### 인증 방식

JWT 기반 인증 - Bearer 토큰

```
Authorization: Bearer <token>
```

## v2 (개발 중)

**예상 출시일**: 미정  
**상태**: 개발 중

### 계획된 변경 사항

* 향상된 OAuth2 인증 시스템 추가
* GraphQL API 엔드포인트 추가
* 실시간 알림 시스템 개선
* 차량 관리 API 확장
* 성능 최적화 및 캐싱 메커니즘 개선

### 하위 호환성 영향

다음 변경 사항은 하위 호환성에 영향을 미칠 수 있습니다:

1. **사용자 인증 방식 변경**
   * v1: JWT 토큰 기반 인증만 지원
   * v2: OAuth2 및 JWT 지원 (이중 인증 옵션)

2. **응답 형식 변경**
   * v1: 단순 JSON 응답
   * v2: 하이퍼미디어 링크가 포함된 HATEOAS 스타일 응답

3. **페이지네이션 매개변수 변경**
   * v1: `page` 및 `size` 매개변수 사용
   * v2: 커서 기반 페이지네이션 추가 (`after` 및 `before` 매개변수)

### 마이그레이션 가이드

#### v1에서 v2로 마이그레이션

##### 인증 시스템 업데이트

**v1 인증 방식**:
```javascript
// v1 인증 요청
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

**v2 인증 방식**:
```javascript
// v2 OAuth2 인증 흐름
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

const { access_token, refresh_token } = await tokenResponse.json();

// 3. API 요청 (v1과 동일)
const response = await fetch('/api/v2/users', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});

// 4. 토큰 갱신 (v2 추가 기능)
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
```

##### 응답 형식 처리

**v1 응답 처리**:
```javascript
const response = await fetch('/api/v1/users');
const users = await response.json();
// users는 객체 배열
```

**v2 응답 처리**:
```javascript
const response = await fetch('/api/v2/users');
const data = await response.json();
// 데이터 추출
const users = data._embedded.users;
// 관련 링크 사용
const nextPageUrl = data._links.next.href;
```

##### 페이지네이션 처리

**v1 페이지네이션**:
```javascript
// 페이지 기반 요청
const response = await fetch('/api/v1/users?page=2&size=10');
const data = await response.json();
```

**v2 페이지네이션**:
```javascript
// 커서 기반 요청 (v2 추가 기능)
const response = await fetch('/api/v2/users?after=user123&limit=10');
const data = await response.json();

// 또는 기존 페이지 기반 요청도 계속 지원
const legacyResponse = await fetch('/api/v2/users?page=2&size=10');
```

## 버전 지원 정책

* 각 API 버전은 최소 2년간 지원됩니다.
* 새 버전 출시 시 기존 버전은 최소 12개월간 병행 지원됩니다.
* 버전 종료 6개월 전부터 Deprecation 경고가 응답 헤더에 포함됩니다.
* 중요한 보안 업데이트는 모든 지원 버전에 적용됩니다.

## 버전 확인 방법

모든 API 응답은 다음 헤더를 포함합니다:

```
X-API-Version: v1
X-API-Version-Date: 2025-05-01
```

현재 지원되는 모든 API 버전을 확인하려면:

```
GET /api/versions
```

특정 API 버전에 대한 상세 정보 확인:

```
GET /api/versions/{version_name}
```