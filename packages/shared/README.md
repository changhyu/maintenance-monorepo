# 차량 정비 관리 시스템 공통 JavaScript/TypeScript 유틸리티

이 패키지는 차량 정비 관리 시스템 모노레포의 다양한 JavaScript 및 TypeScript 기반 서비스에서 사용되는 공통 유틸리티 함수와 모듈을 제공합니다.

## 설치

모노레포 내에서 이 패키지를 의존성으로 추가하려면:

```bash
# npm 사용
npm install @maintenance/shared

# yarn 사용
yarn add @maintenance/shared
```

## 주요 기능

- **날짜 유틸리티**: 날짜 포맷팅, 변환, 비교 등 다양한 날짜 관련 작업을 위한 유틸리티
- **API 클라이언트**: 백엔드 API와의 통신을 위한 표준화된 클라이언트 (오프라인 모드 지원)
- **오류 처리**: 표준화된 오류 타입 및 처리 유틸리티
- **기타 유틸리티**: 데이터 검증, 포맷팅, 변환 등 다양한 공통 기능

## 사용 예시

### 날짜 유틸리티 사용

```typescript
import { dates } from '@maintenance/shared';

// 날짜 포맷팅
const formattedDate = dates.format(new Date(), dates.DateFormat.DISPLAY);
console.log(formattedDate); // '2025년 04월 26일'

// 두 날짜 간의 차이 계산
const daysDiff = dates.diff('2025-04-20', '2025-04-26', 'days');
console.log(daysDiff); // 6

// 날짜에 기간 추가
const futureDate = dates.add('2025-04-26', 5, 'days');
console.log(dates.format(futureDate)); // '2025년 05월 01일'
```

### API 클라이언트 사용

```typescript
import { api } from '@maintenance/shared';

// 기본 클라이언트 사용
const { client } = api;

// 예시 API 호출
async function fetchVehicles() {
  try {
    const vehicles = await client.get('/api/vehicles');
    return vehicles;
  } catch (error) {
    console.error('차량 정보 조회 실패:', error);
    throw error;
  }
}

// 커스텀 클라이언트 생성
const customClient = api.createClient({
  baseURL: 'https://custom-api.example.com',
  authTokenProvider: () => localStorage.getItem('custom_token'),
  offlineMode: true
});

// 오프라인 모드 설정
customClient.setOfflineMode(navigator.onLine === false);

// 네트워크 연결 복구 시 동기화
window.addEventListener('online', async () => {
  customClient.setOfflineMode(false);
  await customClient.syncOfflineRequests();
});
```

### 오류 처리

```typescript
import { errors } from '@maintenance/shared';

try {
  // 어떤 API 호출
  const response = await fetch('/api/data');
  
  if (!response.ok) {
    // 오류 응답 상태에 따라 적절한 오류 객체 생성
    const errorData = await response.json();
    const error = errors.createFromResponse(
      errorData.message,
      response.status,
      errorData
    );
    throw error;
  }
  
  return await response.json();
} catch (error) {
  // 사용자 친화적인 오류 메시지 추출
  const message = errors.parseMessage(error);
  
  // 오류 유형에 따른 처리
  if (error instanceof errors.UnauthorizedError) {
    // 인증 오류 처리
    logout();
    redirectToLogin();
  } else if (error instanceof errors.ValidationError) {
    // 검증 오류 처리
    showValidationErrors(error.errors);
  } else {
    // 기타 오류 처리
    showErrorMessage(message);
  }
}
```

## API 문서

### 날짜 유틸리티 (`dates`)

| 함수 | 설명 | 예시 |
|------|------|------|
| `format(date, format)` | 날짜를 지정된 형식으로 포맷팅 | `dates.format(new Date(), 'YYYY-MM-DD')` |
| `getCurrent(format)` | 현재 날짜를 지정된 형식으로 반환 | `dates.getCurrent()` |
| `isValid(date, format)` | 날짜가 유효한지 확인 | `dates.isValid('2025-04-26')` |
| `diff(date1, date2, unit)` | 두 날짜 간의 차이 계산 | `dates.diff('2025-04-20', '2025-04-26', 'days')` |
| `add(date, amount, unit)` | 날짜에 지정된 기간 추가 | `dates.add('2025-04-26', 1, 'month')` |
| `subtract(date, amount, unit)` | 날짜에서 지정된 기간 차감 | `dates.subtract('2025-04-26', 5, 'days')` |
| `relativeTime(date, refDate)` | 상대적 시간 표시 | `dates.relativeTime('2025-04-20')` |
| `isValidRange(startDate, endDate)` | 날짜 범위가 유효한지 확인 | `dates.isValidRange('2025-04-01', '2025-04-30')` |
| `isSameDay(date1, date2)` | 두 날짜가 같은 날인지 확인 | `dates.isSameDay('2025-04-26T09:00', '2025-04-26T18:00')` |

### API 클라이언트 (`api`)

| 속성/함수 | 설명 |
|-----------|------|
| `client` | 기본 설정된 API 클라이언트 인스턴스 |
| `createClient(config)` | 커스텀 API 클라이언트 생성 함수 |
| `ApiClient` | API 클라이언트 클래스 |

#### 클라이언트 메서드

| 메서드 | 설명 | 예시 |
|--------|------|------|
| `get(url, params, config)` | GET 요청 | `client.get('/api/vehicles', { status: 'active' })` |
| `post(url, data, config)` | POST 요청 | `client.post('/api/repairs', repairData)` |
| `put(url, data, config)` | PUT 요청 | `client.put('/api/vehicles/123', vehicleData)` |
| `patch(url, data, config)` | PATCH 요청 | `client.patch('/api/maintenance/123', { status: 'complete' })` |
| `delete(url, config)` | DELETE 요청 | `client.delete('/api/records/123')` |
| `setOfflineMode(enabled)` | 오프라인 모드 설정 | `client.setOfflineMode(true)` |
| `syncOfflineRequests()` | 오프라인 요청 동기화 | `await client.syncOfflineRequests()` |

### 오류 유틸리티 (`errors`)

| 오류 클래스 | 설명 |
|------------|------|
| `ApplicationError` | 모든 애플리케이션 오류의 기본 클래스 |
| `NetworkError` | 네트워크 연결 문제로 인한 오류 |
| `UnauthorizedError` | 인증 실패 관련 오류 (HTTP 401) |
| `ForbiddenError` | 권한 부족 관련 오류 (HTTP 403) |
| `NotFoundError` | 리소스 없음 관련 오류 (HTTP 404) |
| `ValidationError` | 유효성 검사 실패 관련 오류 (HTTP 400, 422) |
| `DuplicateError` | 리소스 중복 관련 오류 (HTTP 409) |
| `ServerError` | 서버 오류 관련 오류 (HTTP 500) |
| `TimeoutError` | 요청 시간 초과 관련 오류 |
| `OfflineError` | 오프라인 상태 관련 오류 |

| 유틸리티 함수 | 설명 |
|--------------|------|
| `createFromResponse(message, status, data)` | HTTP 상태 코드 기반으로 적절한 오류 객체 생성 |
| `parseMessage(error)` | 오류에서 사용자 친화적인 메시지 추출 |
| `parseCode(error)` | 오류에서 오류 코드 추출 |

## IntersectionObserver 훅

### useIntersectionObserver

요소의 가시성을 감지하는 훅입니다.

```tsx
function useIntersectionObserver<T extends Element = Element>({
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  once?: boolean;
  fallbackInView?: boolean;
}): [React.RefObject<T>, boolean, IntersectionObserverEntry | null]
```

#### 매개변수

- `root`: 대상 요소의 가시성을 확인하는 데 사용되는 뷰포트로 사용할 요소
- `rootMargin`: 루트 요소 주변의 마진
- `threshold`: 콜백이 실행될 대상 요소의 가시성 퍼센티지 (0.0-1.0)
- `once`: true로 설정하면 요소가 한 번 보이게 된 후에는 Observer를 해제합니다
- `fallbackInView`: IntersectionObserver가 지원되지 않을 때 사용할 기본값

#### 반환값

`[elementRef, isIntersecting, entry]`

- `elementRef`: 관찰할 요소에 연결할 ref
- `isIntersecting`: 요소가 현재 보이는지 여부
- `entry`: IntersectionObserverEntry 객체

#### 예제

```tsx
import { useIntersectionObserver } from '@shared/hooks';

function LazyImage({ src, alt }) {
  const [ref, isIntersecting] = useIntersectionObserver({ 
    threshold: 0.1,
    once: true 
  });
  
  return (
    <div ref={ref}>
      {isIntersecting ? (
        <img src={src} alt={alt} />
      ) : (
        <div>로딩 중...</div>
      )}
    </div>
  );
}
```

### useInView

요소가 화면에 보일 때 콜백 함수를 실행하는 훅입니다.

```tsx
function useInView<T extends Element = Element>(
  callback: (isIntersecting: boolean, entry: IntersectionObserverEntry | null) => void,
  options?: IntersectionObserverOptions
): React.RefObject<T>
```

#### 매개변수

- `callback`: 요소의 가시성이 변경될 때 실행할 함수
- `options`: IntersectionObserver 옵션

#### 반환값

- 관찰할 요소에 연결할 ref

#### 예제

```tsx
import { useInView } from '@shared/hooks';

function AnimatedSection() {
  const [isVisible, setIsVisible] = useState(false);
  
  const ref = useInView((inView) => {
    if (inView) {
      setIsVisible(true);
    }
  }, { threshold: 0.5, once: true });
  
  return (
    <div 
      ref={ref}
      className={`transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      내용이 보이면 페이드인 됩니다.
    </div>
  );
}
```

### useInfiniteScroll

무한 스크롤 구현을 위한 훅입니다.

```tsx
function useInfiniteScroll<T extends Element = Element>(
  callback: () => Promise<void> | void,
  options?: IntersectionObserverOptions & { enabled?: boolean }
): [React.RefObject<T>, boolean]
```

#### 매개변수

- `callback`: 다음 페이지를 로드할 때 호출될 함수
- `options`: IntersectionObserver 옵션 및 추가 설정
  - `enabled`: 무한 스크롤 활성화 여부 (기본값: true)

#### 반환값

`[ref, isLoading]`

- `ref`: 관찰할 요소에 연결할 ref (일반적으로 리스트의 마지막 아이템이나 로더 요소)
- `isLoading`: 현재 로딩 중인지 여부

#### 예제

```tsx
import { useInfiniteScroll } from '@shared/hooks';
import { fetchMoreItems } from '@shared/api';

function InfiniteList() {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  
  const loadMoreItems = async () => {
    const newItems = await fetchMoreItems(items.length);
    setItems(prev => [...prev, ...newItems]);
    
    if (newItems.length === 0) {
      setHasMore(false);
    }
  };
  
  const [loaderRef, isLoading] = useInfiniteScroll(
    loadMoreItems,
    { rootMargin: '200px', enabled: hasMore }
  );
  
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.title}</div>
      ))}
      
      <div ref={loaderRef}>
        {isLoading ? '로딩 중...' : hasMore ? '스크롤하여 더 로드하기' : '모든 항목을 로드했습니다'}
      </div>
    </div>
  );
}
```

### loadIntersectionObserverPolyfill

IntersectionObserver API를 지원하지 않는 브라우저를 위한 폴리필을 수동으로 로드하는 함수입니다.

```tsx
async function loadIntersectionObserverPolyfill(): Promise<void>
```

대부분의 경우 필요하지 않습니다. 훅은 자동으로 폴리필 로드를 시도합니다.

## 기여하기

1. 새로운 유틸리티를 추가하기 전에 중복 기능이 없는지 확인해주세요.
2. 모든 유틸리티는 타입 정의를 포함해야 합니다.
3. 유틸리티 추가 시 README 업데이트와 단위 테스트를 함께 작성해주세요.
4. 변경 사항은 Pull Request를 통해 제출해주세요.

## 라이센스

내부용 - 무단 배포 금지
