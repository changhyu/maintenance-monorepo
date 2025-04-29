# 도시 교통 내비게이션 앱

UTIC(도시교통정보센터) API를 활용한 실시간 교통 정보 및 내비게이션 서비스입니다.

## 기능

- 실시간 교통 정보 조회
- 목적지 검색 및 경로 계산
- 교통 사고, 공사, 도로 위험 상황 등 실시간 알림
- 예상 도착 시간(ETA) 및 경로 정보 제공
- 보호구역 알림 기능

## 구성 요소

### 서비스

- **uticService**: UTIC API와의 통신을 담당하는 서비스
- **navigationService**: 내비게이션 기능(경로 계산, 알림 생성 등)을 담당하는 서비스

### 훅

- **useNavigation**: 내비게이션 기능을 React 컴포넌트에서 쉽게 사용할 수 있게 해주는 커스텀 훅

### 컴포넌트

- **Map**: 지도 표시 및 경로 시각화를 담당하는 컴포넌트
- **NavigationPanel**: 경로 정보 및 내비게이션 컨트롤을 제공하는 패널
- **NavigationAlert**: 교통 상황에 대한 알림을 표시하는 컴포넌트
- **DestinationSearch**: 목적지 검색 기능을 제공하는 컴포넌트
- **NavigationApp**: 모든 컴포넌트를 통합한 메인 내비게이션 앱

## 설치 및 설정

### 필수 환경 변수

다음과 같은 환경 변수가 필요합니다:

```
# .env 파일
VITE_UTIC_API_KEY=YOUR_UTIC_API_KEY     # UTIC API 키
VITE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY   # Google Maps API 키
```

### 의존성 설치

```bash
npm install
# 또는
yarn
```

## API 키 발급 방법

### UTIC API 키

1. [도시교통정보센터(UTIC) 개발자 페이지](http://www.utic.go.kr)에 접속합니다.
2. 회원가입 후 로그인합니다.
3. API 키 신청을 진행합니다.
4. 발급받은 API 키를 `.env` 파일의 `VITE_UTIC_API_KEY` 변수에 설정합니다.

### Google Maps API 키

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.
2. 프로젝트를 생성하고 Google Maps JavaScript API와 Places API를 활성화합니다.
3. 사용자 인증 정보 메뉴에서 API 키를 발급받습니다.
4. 발급받은 API 키를 `.env` 파일의 `VITE_MAPS_API_KEY` 변수에 설정합니다.

## 사용 방법

내비게이션 앱은 `/navigation` 경로로 접속할 수 있습니다. 대시보드에도 바로가기가 있습니다.

1. 내비게이션 앱에 접속합니다.
2. 목적지를 검색하거나 지도에서 직접 선택합니다.
3. 경로 계산이 완료되면 지도에 경로가 표시됩니다.
4. 실시간 교통 정보 및 알림을 확인할 수 있습니다.
5. 필요시 경로 재계산 버튼을 클릭하여 최신 교통 정보를 반영할 수 있습니다.

## 코드 작성자

- 최초 작성일: 2025년 4월 29일
- 작성자: 개발팀