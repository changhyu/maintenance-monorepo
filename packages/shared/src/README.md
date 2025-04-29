# Shared 패키지

차량 정비 관리 시스템의 공통 컴포넌트, 유틸리티, 훅 등을 제공하는 공유 패키지입니다.

## 주요 기능

### 컴포넌트

- 공통 UI 컴포넌트 (버튼, 카드, 모달, 아코디언 등)
- 인증 관련 컴포넌트 (로그인 폼, 등록 폼, 보호된 라우트 등)
- 레이아웃 컴포넌트

### 유틸리티

- 오프라인 저장소
- 인증 유틸리티
- 폼 유틸리티
- 포맷팅 유틸리티

### 훅

- `useNetworkStatus` - 네트워크 상태 관리
- `useOfflineSync` - 오프라인 동기화
- `useAuth` - 인증 관리
- `useForm` - 폼 상태 관리
- `useLocalStorage` - 로컬 스토리지 접근
- 기타 UI 관련 훅

## 사용 방법

### 설치

```bash
npm install @maintenance/shared
```

### 컴포넌트 사용 예시

```tsx
import { Button, Card, Modal } from '@maintenance/shared/components/common';
import { LoginForm, ProtectedRoute } from '@maintenance/shared/components/auth';

// 버튼 사용
<Button variant="primary" size="md">버튼</Button>

// 카드 사용
<Card>
  <CardHeader>제목</CardHeader>
  <CardBody>내용</CardBody>
  <CardFooter>푸터</CardFooter>
</Card>

// 로그인 폼 사용
<LoginForm
  onSuccess={() => navigate('/dashboard')}
  onError={(error) => setError(error)}
/>

// 보호된 라우트 사용
<ProtectedRoute
  requiredRoles={['admin']}
  fallback="/login"
>
  <AdminPage />
</ProtectedRoute>
```

### 훅 사용 예시

```tsx
import { useNetworkStatus, useOfflineSync, useAuth } from '@maintenance/shared/hooks';
import { apiClient } from '@maintenance/api-client';

// 네트워크 상태 관리
const { isOnline } = useNetworkStatus();

// 오프라인 동기화
const { pendingCount, syncOfflineRequests } = useOfflineSync({
  apiClient,
  autoSync: true
});

// 인증 관리
const { user, login, logout, isAuthenticated } = useAuth();
```

### 유틸리티 사용 예시

```tsx
import { formatDate, formatNumber } from '@maintenance/shared/utils/formatting';
import offlineStorage from '@maintenance/shared/utils/offlineStorage';

// 날짜 포맷팅
const formattedDate = formatDate(new Date(), 'yyyy-MM-dd');

// 오프라인 저장소 사용
await offlineStorage.setCachedResponse('users', userData, 3600);
const cachedUsers = await offlineStorage.getCachedResponse('users');
```

## 개발

### 파일 구조

```
src/
  ├── components/    # 컴포넌트
  │   ├── common/    # 공통 UI 컴포넌트
  │   ├── auth/      # 인증 관련 컴포넌트
  │   └── layout/    # 레이아웃 컴포넌트
  ├── hooks/         # 커스텀 훅
  ├── utils/         # 유틸리티 함수
  ├── contexts/      # 컨텍스트
  ├── types/         # 타입 정의
  ├── services/      # 서비스
  └── constants/     # 상수
```

### 빌드

```bash
# 패키지 설치
npm install

# 개발 모드 실행
npm run dev

# 빌드
npm run build
```

## 문서

자세한 컴포넌트 문서와 API 참조는 다음 링크에서 확인할 수 있습니다:
[컴포넌트 문서](../docs/components/index.md)
[훅 문서](../docs/hooks/index.md)
[유틸리티 문서](../docs/utils/index.md) 