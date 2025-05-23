# 시스템 아키텍처 문서

## 1. 개요

본 문서는 Maintenance Monorepo 프로젝트의 아키텍처에 대한 전반적인 이해를 제공합니다. 이 문서는 개발팀, 운영팀, 신규 팀원 및 기술 이해관계자들을 위해 작성되었습니다.

### 1.1 목적

이 아키텍처 문서의 목적은 다음과 같습니다:

- 시스템의 주요 구성 요소와 그들 간의 관계 설명
- 설계 결정 사항 및 제약 조건 문서화
- 개발 및 운영 가이드라인 제공
- 신규 팀원의 온보딩 지원

### 1.2 범위

이 문서는 다음 내용을 다룹니다:

- 시스템 개요 및 컨텍스트
- 주요 구성 요소 설명
- 데이터 흐름과 인터페이스
- 배포 아키텍처
- 보안 아키텍처
- 기술 스택

## 2. 시스템 개요

Maintenance Monorepo는 차량 정비 관리를 위한 통합 시스템으로, 다음과 같은 주요 기능을 제공합니다:

- 차량 관리
- 정비 기록 관리
- Git 저장소 연동
- 사용자 및 권한 관리

### 2.1 비즈니스 컨텍스트

이 시스템은 차량 정비 업체가 차량 정보, 정비 이력을 관리하고 추적할 수 있도록 지원합니다. 또한 내부 개발 프로세스를 위한 Git 통합 기능을 제공합니다.

### 2.2 핵심 요구사항

- 확장성: 시스템은 증가하는 데이터 양과 사용자 수에 따라 확장할 수 있어야 합니다.
- 안정성: 시스템은 지속적으로 가용해야 하며, 장애 발생 시 빠르게 복구되어야 합니다.
- 보안: 민감한 사용자 및 차량 정보를 안전하게 보호해야 합니다.
- 유지보수성: 시스템은 쉽게 유지보수하고 업그레이드할 수 있어야 합니다.

## 3. 논리적 아키텍처

시스템은 다음과 같은 주요 구성 요소로 이루어져 있습니다:

### 3.1 프론트엔드

프론트엔드는 사용자 인터페이스를 제공하는 React 기반 SPA(Single Page Application)입니다:

- **UI 컴포넌트**: 재사용 가능한 UI 컴포넌트 라이브러리
- **상태 관리**: Redux를 사용한 앱 상태 관리
- **라우팅**: React Router를 이용한 클라이언트 측 라우팅
- **API 통신**: Axios를 이용한 백엔드 API 통신
- **인증 관리**: JWT 기반 인증 처리

### 3.2 백엔드

백엔드는 FastAPI 기반의 RESTful API 서버입니다:

- **API 계층**: RESTful API 엔드포인트 제공
- **비즈니스 로직 계층**: 핵심 비즈니스 로직 구현
- **데이터 액세스 계층**: 데이터베이스 접근 및 처리
- **인증/인가**: JWT 기반 인증 및 역할 기반 접근 제어
- **Git 서비스 통합**: Git 저장소 관리 및 연동

### 3.3 데이터 레이어

- **관계형 데이터베이스**: PostgreSQL을 사용한 주요 데이터 저장
- **캐싱 레이어**: Redis를 사용한 데이터 캐싱
- **파일 저장소**: 문서 및 이미지 저장을 위한 객체 저장소

### 3.4 인프라 구성 요소

- **컨테이너 오케스트레이션**: Docker 및 Kubernetes
- **API 게이트웨이**: 트래픽 라우팅 및 로드 밸런싱
- **로깅 및 모니터링**: Prometheus, Grafana, Loki
- **CI/CD 파이프라인**: GitHub Actions를 이용한 자동화된 빌드 및 배포

## 4. 컴포넌트 구조

### 4.1 모노레포 구성

프로젝트는 모노레포 구조로 관리되며, 다음과 같은 주요 패키지가 있습니다:

```
maintenance-monorepo/
├── backend/            # 백엔드 API 서버
├── packages/
│   ├── api/            # 레거시 API 코드
│   ├── frontend/       # 프론트엔드 애플리케이션
│   ├── shared/         # 공유 JavaScript/TypeScript 코드
│   ├── api-client/     # API 클라이언트 라이브러리
│   ├── shared-python/  # 공유 Python 코드
│   └── mobile/         # 모바일 앱 코드
├── gitservice/         # Git 서비스 통합 모듈
├── gitmanager/         # Git 관리 기능
└── docs/               # 문서
```

### 4.2 주요 모듈 설명

#### 4.2.1 백엔드 API

백엔드 API는 다음과 같은 주요 모듈로 구성됩니다:

- **인증 관리**: 사용자 인증 및 세션 관리
- **사용자 관리**: 사용자 프로필 및 권한 관리
- **차량 관리**: 차량 정보 및 관리
- **정비 기록 관리**: 차량 정비 기록 관리
- **Git 통합 API**: Git 저장소 연동 및 관리

#### 4.2.2 프론트엔드

프론트엔드는 다음과 같은 주요 모듈로 구성됩니다:

- **인증 모듈**: 로그인/로그아웃 및 사용자 인증 관리
- **관리자 대시보드**: 시스템 관리 기능
- **차량 관리 페이지**: 차량 정보 관리
- **정비 기록 페이지**: 정비 이력 관리 및 조회
- **Git 저장소 관리**: Git 저장소 조회 및 관리

#### 4.2.3 Git 서비스

Git 서비스는 다음과 같은 주요 기능을 제공합니다:

- **저장소 관리**: Git 저장소 생성 및 관리
- **커밋 관리**: 변경 이력 추적 및 관리
- **브랜치 관리**: 브랜치 생성 및 병합 관리
- **권한 관리**: 저장소 접근 권한 관리

## 5. 데이터 아키텍처

### 5.1 데이터 모델

시스템의 주요 엔티티와 관계는 다음과 같습니다:

- **User**: 시스템 사용자 정보
- **Role**: 사용자 역할 정보
- **Permission**: 접근 권한 정보
- **Vehicle**: 차량 정보
- **Maintenance**: 정비 기록 정보
- **Repository**: Git 저장소 정보

### 5.2 데이터 흐름

1. **사용자 인증**:
   - 사용자 → 프론트엔드 → 백엔드 API → 데이터베이스
   - JWT 토큰 발급 → 프론트엔드 저장

2. **차량 정비 기록 관리**:
   - 사용자 → 프론트엔드 → 백엔드 API → 데이터베이스
   - 캐싱 레이어를 통한 성능 최적화

3. **Git 저장소 관리**:
   - 사용자 → 프론트엔드 → 백엔드 API → Git 서비스 → Git 저장소

## 6. 배포 아키텍처

### 6.1 환경 구성

시스템은 다음과 같은 환경으로 구성됩니다:

- **개발 환경**: 개발자 작업 및 테스트
- **스테이징 환경**: QA 및 사용자 수용 테스트
- **프로덕션 환경**: 실제 사용자 서비스 환경

### 6.2 컨테이너화

모든 서비스는 Docker 컨테이너로 패키징되어 배포됩니다:

- **백엔드 API**: Python FastAPI 애플리케이션
- **프론트엔드**: Nginx에서 호스팅되는 정적 파일
- **데이터베이스**: PostgreSQL 컨테이너
- **캐시**: Redis 컨테이너

### 6.3 CI/CD 파이프라인

GitHub Actions를 통한 자동화된 CI/CD 파이프라인:

1. **코드 검증**: 코드 품질 검사 및 테스트
2. **빌드**: Docker 이미지 빌드 및 태깅
3. **보안 스캔**: 이미지 및 의존성 취약점 스캔
4. **배포**: 타겟 환경으로 자동 배포
5. **모니터링**: 배포 후 시스템 상태 모니터링

## 7. 보안 아키텍처

### 7.1 인증 및 인가

- **JWT 기반 인증**: 사용자 세션 관리
- **역할 기반 접근 제어**: 권한 체계 구현
- **API 키 관리**: 외부 시스템 연동을 위한 API 키 관리

### 7.2 데이터 보안

- **전송 중 암호화**: HTTPS를 통한 모든 통신
- **저장 데이터 암호화**: 민감한 데이터 암호화 저장
- **백업 및 복구**: 정기적인 데이터 백업 및 복구 프로세스

### 7.3 인프라 보안

- **네트워크 격리**: 서비스별 네트워크 분리
- **방화벽 및 보안 그룹**: 접근 제어 구현
- **취약점 스캔**: 정기적인 인프라 취약점 스캔
- **시크릿 관리**: 자격 증명 및 시크릿 안전한 관리

## 8. 모니터링 및 운영

### 8.1 로깅

모든 시스템 구성 요소는 구조화된 로그를 생성하며, 이는 중앙 로깅 시스템에 수집됩니다:

- **애플리케이션 로그**: 애플리케이션 동작 및 오류 정보
- **인프라 로그**: 인프라 구성 요소의 상태 및 이벤트
- **보안 로그**: 인증 시도, 권한 변경 등 보안 관련 이벤트

### 8.2 모니터링

다음과 같은 모니터링 도구를 사용합니다:

- **Prometheus**: 메트릭 수집 및 알림
- **Grafana**: 대시보드 및 시각화
- **Loki**: 로그 수집 및 분석
- **Alertmanager**: 알림 관리 및 전송

### 8.3 장애 대응

장애 상황에 대한 대응 프로세스:

1. **감지**: 모니터링 시스템을 통한 장애 감지
2. **알림**: 담당자에게 알림 전송
3. **평가**: 장애 영향 및 원인 평가
4. **대응**: 적절한 대응 조치 수행
5. **복구**: 서비스 정상화
6. **사후 분석**: 근본 원인 분석 및 재발 방지 대책 수립

## 9. 기술 스택

### 9.1 프론트엔드

- **언어**: TypeScript
- **프레임워크**: React
- **상태 관리**: Redux, Redux Toolkit
- **스타일링**: Tailwind CSS
- **빌드 도구**: Webpack, Babel
- **테스트**: Jest, React Testing Library

### 9.2 백엔드

- **언어**: Python
- **프레임워크**: FastAPI
- **ORM**: SQLAlchemy
- **인증**: JWT, Passlib
- **테스트**: Pytest

### 9.3 데이터 저장소

- **관계형 데이터베이스**: PostgreSQL
- **캐시**: Redis
- **객체 저장소**: MinIO

### 9.4 인프라 및 DevOps

- **컨테이너화**: Docker
- **오케스트레이션**: Kubernetes
- **CI/CD**: GitHub Actions
- **모니터링**: Prometheus, Grafana, Loki
- **로깅**: ELK Stack

## 10. 개발 환경 설정

### 10.1 필수 소프트웨어

개발 환경을 위해 다음과 같은 소프트웨어가 필요합니다:

- Node.js (v16 이상)
- Python 3.9 이상
- Docker 및 Docker Compose
- Git

### 10.2 로컬 개발 환경 설정

```bash
# 저장소 복제
git clone https://github.com/yourusername/maintenance-monorepo.git
cd maintenance-monorepo

# 환경 변수 설정
cp .env.example .env

# 의존성 설치
npm install
pip install -r requirements.txt

# 개발 서버 실행
npm run dev
```

### 10.3 Docker 개발 환경

```bash
# 컨테이너 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스만 실행
docker-compose up -d backend frontend
```

## 11. 향후 발전 계획

### 11.1 단기 계획 (0-6개월)

- 테스트 자동화 확대: 단위 테스트, 통합 테스트, E2E 테스트
- 모니터링 시스템 강화: 사용자 경험 모니터링 추가
- API 문서화 개선: OpenAPI 기반 문서 자동화

### 11.2 중기 계획 (6-12개월)

- 성능 최적화: API 응답 시간 개선, 프론트엔드 렌더링 최적화
- 마이크로서비스 아키텍처 검토: 특정 기능의 분리 가능성 평가
- 데이터 분석 기능 추가: 정비 데이터 분석 및 예측

### 11.3 장기 계획 (12개월 이상)

- 머신러닝 기반 예측 정비: 차량 상태 기반 정비 주기 예측
- 모바일 앱 확장: 네이티브 앱 개발 검토
- 다국어 지원: 국제화 및 현지화 지원 추가

## 12. 부록

### 12.1 용어 정리

- **JWT**: JSON Web Token, 인증 정보를 안전하게 전송하기 위한 토큰
- **API**: Application Programming Interface, 애플리케이션 간 통신을 위한 인터페이스
- **ORM**: Object-Relational Mapping, 객체와 관계형 데이터베이스를 연결하는 기술
- **CI/CD**: Continuous Integration/Continuous Deployment, 지속적 통합 및 배포
- **모노레포**: 여러 프로젝트를 하나의 저장소에서 관리하는 방식

### 12.2 참고 자료

- FastAPI 공식 문서: <https://fastapi.tiangolo.com/>
- React 공식 문서: <https://reactjs.org/docs>
- Docker 문서: <https://docs.docker.com/>
- GitHub Actions 문서: <https://docs.github.com/en/actions>

### 12.3 관련 문서

- [개발 환경 설정 가이드](./setup.md)
- [API 문서](./api.md)
- [배포 가이드](./deployment.md)
- [모니터링 설정 가이드](./monitoring.md)
- [문제 해결 가이드](./troubleshooting.md)
