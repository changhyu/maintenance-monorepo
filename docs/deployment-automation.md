# 배포 자동화 가이드

이 문서는 Maintenance Monorepo 프로젝트의 배포 자동화 프로세스에 대한 가이드입니다. Docker 기반 배포를 자동화하고 모니터링하는 방법을 설명합니다.

## 목차

1. [배포 자동화 스크립트](#1-배포-자동화-스크립트)
2. [환경 변수 설정](#2-환경-변수-설정)
3. [모니터링 도구](#3-모니터링-도구)
4. [일반적인 배포 문제 해결](#4-일반적인-배포-문제-해결)
5. [배포 체크리스트](#5-배포-체크리스트)

## 1. 배포 자동화 스크립트

프로젝트는 Docker 기반 배포 자동화를 위한 다양한 스크립트를 제공합니다.

### 1.1 통합 배포 스크립트 (`scripts/deploy.sh`)

이 스크립트는 Docker 컨테이너 빌드부터 배포, 상태 확인까지 전체 과정을 자동화합니다.

**사용법**:
```bash
./scripts/deploy.sh [environment] [version]
```

**매개변수**:
- `environment`: 배포 환경 (dev, staging, prod), 기본값은 dev
- `version`: 배포할 버전 태그, 기본값은 latest

**예시**:
```bash
# 개발 환경에 최신 버전 배포
./scripts/deploy.sh dev

# 스테이징 환경에 특정 버전 배포
./scripts/deploy.sh staging v1.2.3

# 프로덕션 환경에 배포
./scripts/deploy.sh prod v2.0.0
```

### 1.2 배포 프로세스

배포 스크립트는 다음 단계를 자동으로 수행합니다:

1. 환경 변수 설정
2. Docker 볼륨 디렉토리 생성
3. Docker 이미지 빌드
4. 이미지 태깅 (타임스탬프 포함)
5. 기존 컨테이너 중지
6. 새 컨테이너 실행
7. 컨테이너 상태 및 로그 확인
8. 서비스 헬스체크 수행
9. 배포 이력 로깅

## 2. 환경 변수 설정

환경 변수 설정은 `scripts/setup_env.sh` 스크립트를 통해 자동화되어 있습니다.

### 2.1 환경 변수 설정 스크립트

**사용법**:
```bash
./scripts/setup_env.sh [environment]
```

**매개변수**:
- `environment`: 환경 설정 (dev, staging, prod), 기본값은 dev

**예시**:
```bash
# 개발 환경 변수 설정
./scripts/setup_env.sh dev

# 스테이징 환경 변수 설정
./scripts/setup_env.sh staging

# 프로덕션 환경 변수 설정
./scripts/setup_env.sh prod
```

### 2.2 생성되는 환경 변수 파일

각 환경에 따라 다음 파일이 생성됩니다:

- **개발 환경**:
  - `.env.development`: 루트 환경 변수
  - `packages/api/.env.development`: API 서비스 환경 변수
  - `packages/frontend/.env.development`: 프론트엔드 환경 변수

- **스테이징 환경**:
  - `.env.staging`: 루트 환경 변수
  - `packages/api/.env.staging`: API 서비스 환경 변수
  - `packages/frontend/.env.staging`: 프론트엔드 환경 변수

- **프로덕션 환경**:
  - `.env.production`: 루트 환경 변수
  - `packages/api/.env.production`: API 서비스 환경 변수
  - `packages/frontend/.env.production`: 프론트엔드 환경 변수

### 2.3 환경 변수 커스터마이징

프로젝트 요구사항에 맞게 환경 변수를 커스터마이즈하려면 `scripts/setup_env.sh` 파일을 편집하여 각 환경에 맞는 값을 설정합니다.

## 3. 모니터링 도구

프로젝트는 Docker 컨테이너 모니터링을 위한 스크립트를 제공합니다.

### 3.1 컨테이너 모니터링 스크립트 (`scripts/monitor.sh`)

이 스크립트는 Docker 컨테이너의 리소스 사용량과 상태를 모니터링합니다.

**사용법**:
```bash
./scripts/monitor.sh [interval]
```

**매개변수**:
- `interval`: 모니터링 주기(초), 기본값은 10초

**예시**:
```bash
# 기본 주기(10초)로 모니터링
./scripts/monitor.sh

# 5초 주기로 모니터링
./scripts/monitor.sh 5

# 30초 주기로 모니터링
./scripts/monitor.sh 30
```

### 3.2 모니터링 데이터

모니터링 스크립트는 다음 정보를 수집합니다:

- 컨테이너 ID 및 이름
- CPU 사용률
- 메모리 사용량 및 비율
- 네트워크 I/O
- 디스크 I/O
- 컨테이너 상태
- API 및 프론트엔드 헬스체크 결과

### 3.3 로그 파일

모니터링 데이터는 다음 위치에 저장됩니다:
```
logs/monitoring/container_stats_YYYYMMDD.log
```

로그 파일은 10MB 크기에 도달하면 자동으로 로테이션됩니다.

## 4. 일반적인 배포 문제 해결

배포 과정에서 발생할 수 있는 일반적인 문제와 해결 방법입니다.

### 4.1 Docker 이미지 빌드 실패

**문제**: Docker 이미지 빌드가 실패합니다.

**해결책**:
1. 로그를 확인하여 구체적인 오류 메시지 파악
2. 의존성 문제인 경우 `packages/api/requirements.txt` 또는 `packages/frontend/package.json` 확인
3. 디스크 공간 부족인 경우 불필요한 이미지 정리: `docker system prune -a`

### 4.2 컨테이너 시작 실패

**문제**: 컨테이너가 시작되지 않거나 곧바로 종료됩니다.

**해결책**:
1. 컨테이너 로그 확인: `docker logs <container_id>`
2. 환경 변수 설정 확인: `.env` 파일이 올바르게 생성되었는지 확인
3. 포트 충돌 확인: `netstat -tuln | grep <port>` 또는 다른 포트로 변경

### 4.3 API 서비스 모듈 경로 문제

**문제**: API 서비스가 `ModuleNotFoundError: No module named 'backend'` 오류를 표시합니다.

**해결책**:
1. `Dockerfile.api` 에서 `PYTHONPATH` 환경 변수 확인
2. 올바른 설정: `ENV PYTHONPATH=/app:/app/packages/api`
3. 컨테이너 재빌드 및 재시작

### 4.4 포트 충돌 문제

**문제**: `Error response from daemon: ... failed to bind port: address already in use`

**해결책**:
1. 충돌하는 포트 확인: `lsof -i :<port>`
2. 해당 프로세스 종료 또는 다른 포트 사용
3. 예: `docker-compose run -d -p 3000:80 frontend`

## 5. 배포 체크리스트

성공적인 배포를 위한 체크리스트입니다.

### 5.1 배포 전 체크리스트

- [ ] 모든 코드 변경사항이 버전 관리 시스템에 커밋됨
- [ ] 테스트가 통과함
- [ ] 환경 변수가 올바르게 설정됨
- [ ] 충분한 디스크 공간 확보
- [ ] 이전 배포의 백업 존재

### 5.2 배포 후 체크리스트

- [ ] 모든 컨테이너가 실행 중인지 확인
- [ ] API 서비스 헬스체크 통과
- [ ] 프론트엔드 서비스 접근 가능
- [ ] 로그에 오류 없음
- [ ] 모니터링 시스템에서 정상 지표 확인

## 6. 추가 자료

- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [프로젝트 배포 문서](./deployment.md)
- [모니터링 설정 가이드](./monitoring.md)