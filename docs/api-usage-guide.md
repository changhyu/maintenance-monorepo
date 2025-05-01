# API 사용 가이드

이 문서는 프로젝트의 API를 효과적으로 사용하기 위한 개발자 가이드입니다. 프론트엔드에서 백엔드 API와 통신하는 방법과 모범 사례를 설명합니다.

## API 클라이언트 사용법

### 기본 설정

프론트엔드 프로젝트에서 API 요청을 보낼 때는 공통 API 클라이언트를 사용하는 것이 권장됩니다. API 클라이언트는 다음 위치에 있습니다:

- 웹사이트: `/website/src/utils/api.ts`
- 프론트엔드: `/packages/frontend/src/services/api.ts`

### 환경 변수 설정

API 엔드포인트와 버전은 환경 변수로 설정합니다:

```
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_VERSION=v1
```

또는 React 프로젝트의 경우:

```
# .env
VITE_API_URL=http://localhost:8000/api/v1
```

### API 클라이언트 기본 사용법

API 클라이언트는 다음과 같은 메서드를 제공합니다:

```typescript
// 기본 HTTP 메서드
api.get<T>(path: string, params?: Record<string, any>, options?: RequestInit): Promise<T>
api.post<T>(path: string, data?: any, options?: RequestInit): Promise<T>
api.put<T>(path: string, data?: any, options?: RequestInit): Promise<T>
api.delete<T>(path: string, options?: RequestInit): Promise<T>

// 특화된 API 모듈
api.auth.checkAuthStatus()
api.auth.login(username: string, password: string)
api.auth.logout()

// 메시지 API
api.contacts.getContacts(params: { page?: number; limit?: number; all?: boolean })
```

### 사용 예시

```typescript
// 사용자 목록 가져오기
const fetchUsers = async () => {
  try {
    const users = await api.get('/users', { page: 1, limit: 10 });
    return users;
  } catch (error) {
    console.error('사용자 목록 조회 실패:', error);
    return [];
  }
};

// 로그인
const login = async (username: string, password: string) => {
  try {
    const result = await api.auth.login(username, password);
    return result;
  } catch (error) {
    console.error('로그인 실패:', error);
    throw error;
  }
};
```

## API 요청 모범 사례

### 1. 오류 처리

모든 API 요청에는 적절한 오류 처리를 포함해야 합니다:

```typescript
try {
  const data = await api.get('/users');
  // 성공 처리
} catch (error) {
  // 오류 처리
  if (error instanceof Error) {
    console.error('API 오류:', error.message);
  }
  
  // 개발 환경에서는 폴백 데이터 사용
  if (shouldUseFallbackData()) {
    return FALLBACK_DATA;
  }
}
```

### 2. 로딩 상태 관리

API 요청 중에는 로딩 상태를 관리하여 사용자에게 피드백을 제공합니다:

```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await api.get('/data');
    // 성공 처리
  } catch (error) {
    // 오류 처리
  } finally {
    setLoading(false);
  }
};
```

### 3. 타임아웃 처리

장시간 실행되는 요청의 경우 타임아웃을 설정하는 것이 좋습니다:

```typescript
// API 클라이언트는 이미 타임아웃 처리가 내장되어 있습니다
const data = await api.get('/slow-endpoint');

// 커스텀 타임아웃이 필요한 경우 옵션으로 지정할 수 있습니다
const options = { timeoutMs: 15000 }; // 15초
const data = await api.get('/very-slow-endpoint', {}, options);
```

### 4. 캐싱 고려

자주 변경되지 않는 데이터는 캐싱을 고려합니다:

```typescript
// 간단한 메모리 캐시
const cache = new Map();

const fetchWithCache = async (url: string, expireMs = 60000) => {
  const cacheKey = url;
  
  // 캐시에서 데이터 확인
  const cachedData = cache.get(cacheKey);
  if (cachedData && cachedData.timestamp + expireMs > Date.now()) {
    return cachedData.data;
  }
  
  // 데이터 가져오기
  const data = await api.get(url);
  
  // 캐시에 저장
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
};
```

### 5. 일관된 API 응답 형식

백엔드 API는 일관된 응답 형식을 사용합니다:

```typescript
// 성공 응답
{
  success: true,
  data: [...],
  pagination?: {
    total: number,
    page: number,
    limit: number,
    hasMore: boolean
  }
}

// 오류 응답
{
  success: false,
  detail: "오류 메시지",
  code?: "ERROR_CODE"
}
```

## 개발 환경에서의 API 사용

개발 환경에서는 백엔드가 없거나 API 오류가 발생할 때 폴백 데이터를 사용합니다:

```typescript
// 폴백 데이터 사용 여부
export const shouldUseFallbackData = (): boolean => {
  return (
    process.env.NODE_ENV === 'development' || 
    (typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname.includes('vercel.app')
    ))
  );
};

// 폴백 데이터 정의
const FALLBACK_DATA = [
  { id: 1, name: '테스트 데이터 1' },
  { id: 2, name: '테스트 데이터 2' }
];

// API 호출
const fetchData = async () => {
  try {
    return await api.get('/data');
  } catch (error) {
    if (shouldUseFallbackData()) {
      console.log('폴백 데이터 사용');
      return FALLBACK_DATA;
    }
    throw error;
  }
};
```

## API 버전 관리

API 버전 관리에 대한 자세한 내용은 [API 버전 관리 가이드](./api-versioning-guide.md)를 참조하세요.

## API 엔드포인트 목록

현재 사용 가능한 API 엔드포인트 목록입니다:

### 인증 관련

- `POST /api/v1/token` - 액세스 토큰 발급
- `GET /api/v1/admin/auth-status` - 관리자 인증 상태 확인
- `POST /api/v1/admin/login` - 관리자 로그인
- `POST /api/v1/admin/logout` - 관리자 로그아웃

### 사용자 관련

- `GET /api/v1/users` - 사용자 목록 조회
- `GET /api/v1/users/{id}` - 특정 사용자 조회
- `POST /api/v1/users` - 사용자 생성
- `PUT /api/v1/users/{id}` - 사용자 수정
- `DELETE /api/v1/users/{id}` - 사용자 삭제

### 정비 관련

- `GET /api/v1/maintenance/records` - 정비 기록 목록 조회
- `GET /api/v1/maintenance/records/{id}` - 특정 정비 기록 조회
- `POST /api/v1/maintenance/records` - 정비 기록 생성
- `PUT /api/v1/maintenance/records/{id}` - 정비 기록 수정
- `DELETE /api/v1/maintenance/records/{id}` - 정비 기록 삭제

### 차량 관련

- `GET /api/v1/vehicles` - 차량 목록 조회
- `GET /api/v1/vehicles/{id}` - 특정 차량 조회
- `POST /api/v1/vehicles` - 차량 등록
- `PUT /api/v1/vehicles/{id}` - 차량 정보 수정
- `DELETE /api/v1/vehicles/{id}` - 차량 삭제

### 기타

- `GET /api/v1/system/health` - 시스템 상태 확인
- `GET /api/versions` - API 버전 목록 조회

API 문서화는 Swagger UI를 통해 제공됩니다:
- 개발 환경: `http://localhost:8000/docs`
- 프로덕션 환경: `https://api.example.com/docs`
