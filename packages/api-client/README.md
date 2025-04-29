# API 클라이언트 패키지

차량 정비 관리 시스템의 백엔드 API와 통신하기 위한 클라이언트 라이브러리입니다.

## 주요 기능

- 표준화된 API 통신 인터페이스
- 인증 토큰 관리 (발급, 갱신, 저장)
- 오프라인 모드 지원
  - 오프라인 요청 큐
  - 응답 캐싱
  - 자동 동기화
- 에러 처리 및 네트워크 재시도
- 타입 안전성

## 설치

```bash
npm install @maintenance/api-client
```

## 사용 방법

### 기본 사용법

```typescript
import { createApiClient } from '@maintenance/api-client';

// API 클라이언트 인스턴스 생성
const apiClient = createApiClient({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  enableLogging: true
});

// API 요청 보내기
async function fetchUsers() {
  try {
    const response = await apiClient.get('/users');
    console.log(response.data);
  } catch (error) {
    console.error('사용자 목록 조회 실패:', error);
  }
}
```

### 인증 처리

```typescript
import { createApiClient, saveToken, getUserInfo } from '@maintenance/api-client';

const apiClient = createApiClient({
  baseURL: 'https://api.example.com',
  tokenRefreshEndpoint: '/auth/refresh'
});

// 로그인
async function login(username: string, password: string) {
  try {
    const response = await apiClient.post('/auth/login', { username, password });
    
    // 토큰 저장
    const { accessToken, refreshToken, expiresIn } = response.data;
    saveToken({
      token: accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn * 1000),
      tokenType: 'Bearer'
    });
    
    // 로그인 성공
    return getUserInfo();
  } catch (error) {
    console.error('로그인 실패:', error);
    throw error;
  }
}

// 인증이 필요한 요청
async function fetchProtectedResource() {
  try {
    // 토큰은 자동으로 헤더에 포함됩니다
    return await apiClient.get('/protected-resource');
  } catch (error) {
    console.error('요청 실패:', error);
    throw error;
  }
}
```

### 오프라인 모드

```typescript
import { createApiClient } from '@maintenance/api-client';
import { createOfflineStorage } from '@maintenance/shared/utils/offlineStorage';

// 오프라인 스토리지 인스턴스 생성
const offlineStorage = createOfflineStorage();

// 오프라인 지원 API 클라이언트 생성
const apiClient = createApiClient({
  baseURL: 'https://api.example.com',
  offlineStorage
});

// 오프라인 모드 활성화/비활성화
apiClient.setOfflineMode(true);

// 요청 - 오프라인 상태에서는 캐시에서 데이터 조회 또는 큐에 요청 저장
async function fetchData() {
  try {
    const response = await apiClient.get('/data');
    console.log(response.data);
    
    // 오프라인 응답 확인
    if (response.offline) {
      console.log('오프라인 데이터입니다.');
    }
  } catch (error) {
    console.error('요청 실패:', error);
  }
}

// 저장된 요청 동기화 (네트워크 연결 시)
import { useOfflineSync } from '@maintenance/shared/hooks';

function OfflineSyncComponent() {
  // 오프라인 요청 동기화 관리
  const { pendingCount, isSyncing, syncOfflineRequests } = useOfflineSync({
    apiClient,
    autoSync: true
  });
  
  return (
    <div>
      {pendingCount > 0 && (
        <button onClick={syncOfflineRequests} disabled={isSyncing}>
          {isSyncing ? '동기화 중...' : `${pendingCount}개 요청 동기화`}
        </button>
      )}
    </div>
  );
}
```

### 파일 업로드

```typescript
import { createApiClient } from '@maintenance/api-client';

const apiClient = createApiClient({
  baseURL: 'https://api.example.com'
});

async function uploadFile(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.upload('/upload', formData);
    return response.data;
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    throw error;
  }
}
```

## API 참조

### ApiClient 클래스

- `get<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>>`
- `post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>>`
- `put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>>`
- `patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>>`
- `delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>`
- `upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<ApiResponse<T>>`
- `setOfflineMode(enabled: boolean): void`
- `setAuthToken(token: string, tokenType?: string): void`

### 인증 함수

- `saveToken(tokenInfo: TokenInfo): void`
- `getStoredToken(): TokenInfo | null`
- `removeToken(): void`
- `refreshToken(refreshEndpoint?: string): Promise<TokenRefreshResult>`
- `parseJwt(token: string): any`
- `hasRole(role: string): boolean`
- `getUserRoles(): string[]`
- `getUserId(): string | null`
- `getUserInfo(): any | null`

## 개발

### 의존성

- axios: HTTP 클라이언트
- @maintenance/shared: 오프라인 스토리지 및 훅 기능

### 빌드

```bash
# 패키지 설치
npm install

# 개발 모드
npm run dev

# 빌드
npm run build

# 테스트
npm test
```

## 문서

API 클라이언트 사용에 관한 더 자세한 문서는 [여기](./docs/index.md)에서 확인할 수 있습니다. 