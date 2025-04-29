# 배포 프로세스 가이드

이 문서는 Maintenance Monorepo 프로젝트의 배포 프로세스와 관련된 정보를 제공합니다. 개발자, DevOps 엔지니어 및 시스템 관리자를 위한 가이드입니다.

## 목차

1. [배포 아키텍처 개요](#1-배포-아키텍처-개요)
2. [배포 환경](#2-배포-환경)
3. [CI/CD 파이프라인](#3-cicd-파이프라인)
4. [수동 배포 절차](#4-수동-배포-절차)
5. [롤백 절차](#5-롤백-절차)
6. [데이터베이스 마이그레이션](#6-데이터베이스-마이그레이션)
7. [보안 고려사항](#7-보안-고려사항)
8. [성능 모니터링](#8-성능-모니터링)
9. [문제 해결](#9-문제-해결)

## 1. 배포 아키텍처 개요

Maintenance Monorepo 프로젝트는 컨테이너화된 마이크로서비스 아키텍처를 사용합니다. 주요 구성 요소는 다음과 같습니다:

- **프론트엔드**: React 기반 SPA, Nginx에서 정적 파일로 제공
- **백엔드 API**: Python FastAPI 애플리케이션
- **데이터베이스**: PostgreSQL
- **캐시**: Redis
- **API 게이트웨이**: 트래픽 라우팅 및 로드 밸런싱

### 1.1 인프라 구성도

```
                                  +----------------+
                                  |   로드 밸런서   |
                                  +--------+-------+
                                           |
                +---------------------------+---------------------------+
                |                           |                           |
      +---------v----------+     +---------v----------+     +---------v----------+
      |  프론트엔드 서버     |     |   백엔드 API 서버    |     |   백엔드 API 서버    |
      |   (Nginx + SPA)    |     |     (FastAPI)      |     |     (FastAPI)      |
      +---------+----------+     +---------+----------+     +---------+----------+
                |                           |                           |
                |                 +---------v----------+                |
                |                 |      캐시 서버       |                |
                |                 |      (Redis)       |                |
                |                 +---------+----------+                |
                |                           |                           |
                |                 +---------v----------+                |
                +---------------->|    데이터베이스 서버   |<---------------+
                                  |    (PostgreSQL)    |
                                  +--------------------+
```

### 1.2 컨테이너 구성

각 서비스는 Docker 컨테이너로 패키징되어 있으며, 다음과 같은 이미지를 사용합니다:

| 서비스 | 이미지 | 설명 |
|--------|--------|------|
| 프론트엔드 | `maintenance-frontend:latest` | Nginx에서 호스팅되는 React 애플리케이션 |
| 백엔드 API | `maintenance-api:latest` | FastAPI 애플리케이션 |
| 데이터베이스 | `postgres:14` | PostgreSQL 데이터베이스 |
| 캐시 | `redis:7` | Redis 캐시 서버 |

## 2. 배포 환경

프로젝트는 다음과 같은 환경으로 구성됩니다:

### 2.1 개발 환경

- **목적**: 기능 개발 및 초기 테스트
- **URL**: <https://dev.example.com>
- **브랜치**: `develop`
- **자동 배포**: `develop` 브랜치에 병합 시 자동 배포
- **데이터**: 테스트 데이터

### 2.2 스테이징 환경

- **목적**: QA 및 통합 테스트
- **URL**: <https://staging.example.com>
- **브랜치**: `release/*`
- **자동 배포**: `release/*` 브랜치 생성 시 자동 배포
- **데이터**: 익명화된 프로덕션 데이터 샘플

### 2.3 프로덕션 환경

- **목적**: 실제 사용자 서비스 제공
- **URL**: <https://example.com>
- **브랜치**: `main`
- **자동 배포**: `main` 브랜치에 병합 시 수동 확인 후 배포
- **데이터**: 실제 사용자 데이터

## 3. CI/CD 파이프라인

프로젝트는 GitHub Actions를 사용하여 CI/CD 파이프라인을 구성합니다.

### 3.1 워크플로우 구성

주요 워크플로우 파일은 다음과 같습니다:

- `.github/workflows/build-and-test.yml`: 빌드 및 테스트 자동화
- `.github/workflows/security-scan-improved.yml`: 보안 취약점 스캔
- `.github/workflows/deploy-automation.yml`: 배포 자동화
- `.github/workflows/monorepo-build.yml`: 모노레포 빌드 최적화

### 3.2 CI 프로세스

1. **코드 검증**:
   - 코드 품질 검사 (ESLint, Flake8)
   - 유닛 테스트 실행
   - 통합 테스트 실행

2. **빌드**:
   - Docker 이미지 빌드
   - 이미지 태깅 (SHA, 환경, latest)
   - 이미지 캐싱

3. **보안 검사**:
   - 코드 스캔
   - 의존성 취약점 검사
   - Docker 이미지 취약점 스캔

### 3.3 CD 프로세스

1. **배포 준비**:
   - 환경 변수 구성
   - 환경별 구성 파일 준비

2. **배포 실행**:
   - 컨테이너 업데이트
   - 데이터베이스 마이그레이션
   - 서비스 상태 확인

3. **배포 확인**:
   - 상태 점검
   - 지표 모니터링
   - 알림 발송

### 3.4 배포 워크플로우 예시

```yaml
# .github/workflows/deploy-automation.yml
name: Deploy Automation

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  workflow_dispatch:
    inputs:
      environment:
        description: '배포 환경'
        required: true
        default: 'development'
        
jobs:
  validate:
    name: Validate Deployment
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.set-env.outputs.environment }}
      
  build:
    name: Build Application
    needs: validate
    runs-on: ubuntu-latest
    
  deploy-dev:
    name: Deploy to Development
    needs: [validate, build]
    if: needs.validate.outputs.environment == 'development'
    runs-on: ubuntu-latest
    
  deploy-staging:
    name: Deploy to Staging
    needs: [validate, build]
    if: needs.validate.outputs.environment == 'staging'
    runs-on: ubuntu-latest
    
  deploy-prod:
    name: Deploy to Production
    needs: [validate, build]
    if: needs.validate.outputs.environment == 'production'
    runs-on: ubuntu-latest
```

## 4. 수동 배포 절차

자동화된 파이프라인이 실패하거나 특별한 배포가 필요한 경우에 사용하는 수동 배포 절차입니다.

### 4.1 프론트엔드 배포

```bash
# 소스 코드 가져오기
git clone https://github.com/yourusername/maintenance-monorepo.git
cd maintenance-monorepo

# 특정 태그 또는 커밋으로 전환
git checkout v1.2.3  # 또는 특정 커밋 해시

# 환경 변수 설정
cp .env.production .env

# 프론트엔드 빌드
cd packages/frontend
npm ci
npm run build

# 배포 (예: Nginx 서버로 복사)
scp -r build/* user@frontend-server:/var/www/html/
```

### 4.2 백엔드 배포

```bash
# 소스 코드 가져오기
git clone https://github.com/yourusername/maintenance-monorepo.git
cd maintenance-monorepo

# 특정 태그 또는 커밋으로 전환
git checkout v1.2.3  # 또는 특정 커밋 해시

# Docker 이미지 빌드
docker build -t maintenance-api:v1.2.3 -f Dockerfile.api .

# 이미지 저장소에 푸시
docker tag maintenance-api:v1.2.3 registry.example.com/maintenance-api:v1.2.3
docker push registry.example.com/maintenance-api:v1.2.3

# 서버에 SSH 접속
ssh user@backend-server

# 새 이미지로 서비스 업데이트
docker pull registry.example.com/maintenance-api:v1.2.3
docker-compose -f docker-compose.prod.yml up -d
```

### 4.3 전체 스택 배포

```bash
# 서버에 SSH 접속
ssh user@deployment-server

# 배포 스크립트 실행
cd /opt/deployment
./deploy.sh v1.2.3
```

## 5. 롤백 절차

배포 후 문제가 발생했을 때 사용하는 롤백 절차입니다.

### 5.1 자동 롤백

GitHub Actions 워크플로우의 자동 롤백 기능을 사용합니다:

```bash
# GitHub Actions에서 수동으로 워크플로우 실행
gh workflow run deploy-automation.yml -f environment=production -f rollback=true -f version=v1.2.2
```

### 5.2 수동 롤백

자동 롤백이 실패했을 경우 수동으로 롤백합니다:

```bash
# 서버에 SSH 접속
ssh user@deployment-server

# 이전 버전으로 롤백
cd /opt/deployment
./rollback.sh

# 또는 특정 버전으로 롤백
./deploy.sh v1.2.2
```

### 5.3 데이터베이스 롤백

데이터베이스 변경이 포함된 경우:

```bash
# 데이터베이스 서버에 접속
ssh user@db-server

# 마이그레이션 롤백
cd /opt/maintenance-app
python -m alembic downgrade -1

# 또는 특정 리비전으로 롤백
python -m alembic downgrade a1b2c3d4e5f6
```

## 6. 데이터베이스 마이그레이션

### 6.1 마이그레이션 생성

```bash
# 새 마이그레이션 생성
cd backend
alembic revision --autogenerate -m "설명"

# 마이그레이션 파일 편집 (필요한 경우)
vim migrations/versions/XXXXXXXX_설명.py
```

### 6.2 마이그레이션 적용

배포 프로세스에서 자동으로 실행되지만, 필요한 경우 수동으로 적용할 수 있습니다:

```bash
# 마이그레이션 적용
cd backend
alembic upgrade head

# 또는 특정 리비전으로 업그레이드
alembic upgrade a1b2c3d4e5f6
```

### 6.3 마이그레이션 확인

```bash
# 현재 리비전 확인
alembic current

# 마이그레이션 히스토리 확인
alembic history --verbose
```

### 6.4 마이그레이션 모범 사례

- 큰 테이블을 변경할 때는 다운타임을 최소화하기 위한 전략 수립
- 마이그레이션은 반드시 백업 후 실행
- 테스트 환경에서 먼저 마이그레이션 테스트
- 롤백 계획 수립

## 7. 보안 고려사항

### 7.1 비밀 관리

프로젝트는 비밀 정보를 다음과 같이 관리합니다:

- **GitHub Secrets**: CI/CD 파이프라인에서 사용되는 비밀
- **환경 변수**: 런타임 구성에 사용되는 민감한 정보
- **Kubernetes Secrets**: 클러스터 내 서비스 간 공유되는 비밀

중요한 비밀 정보는 직접 코드에 포함하지 않도록 합니다.

### 7.2 이미지 보안

- 모든 Docker 이미지는 배포 전 Trivy로 스캔
- 기본 이미지는 정기적으로 업데이트
- 최소 권한 원칙 적용 (루트가 아닌 사용자로 실행)
- 불필요한 패키지 제거

### 7.3 네트워크 보안

- 모든 외부 통신은 TLS/SSL 암호화
- 내부 서비스 간 통신도 필요시 암호화
- 네트워크 정책으로 필요한 통신만 허용
- WAF(Web Application Firewall) 사용

### 7.4 접근 제어

- 프로덕션 환경 접근은 승인된 관리자로 제한
- 다단계 인증(MFA) 필수
- 정기적인 접근 권한 감사
- 제로 트러스트 보안 모델 적용

## 8. 성능 모니터링

배포 후 시스템의 성능을 모니터링하고 문제를 조기에 발견하기 위한 방법입니다.

### 8.1 모니터링 도구

- **Prometheus**: 메트릭 수집
- **Grafana**: 대시보드 및 시각화
- **Loki**: 로그 집계
- **Alertmanager**: 알림 관리

### 8.2 핵심 메트릭

다음과 같은 핵심 메트릭을 모니터링합니다:

- **시스템 메트릭**: CPU, 메모리, 디스크, 네트워크 사용량
- **애플리케이션 메트릭**: 요청 수, 응답 시간, 오류율
- **비즈니스 메트릭**: 활성 사용자, 트랜잭션 성공률, 주요 기능 사용량

### 8.3 알림 설정

중요한 문제 발생 시 알림을 받을 수 있도록 구성합니다:

- **Slack 알림**: 팀 채널로 중요 알림 전송
- **이메일 알림**: 심각한 문제에 대한 담당자 알림
- **PagerDuty 연동**: 긴급 상황에 대한 온콜 알림

### 8.4 대시보드

주요 대시보드는 다음과 같습니다:

- **시스템 개요**: 전체 시스템 상태
- **서비스 상태**: 개별 서비스의 상태 및 성능
- **사용자 경험**: 사용자 관점에서의 성능 지표
- **비즈니스 지표**: 주요 비즈니스 메트릭

### 8.5 로그 관리

로그는 중앙 집중식으로 관리됩니다:

- 구조화된 JSON 형식 로그 사용
- 로그 보존 정책: 30일
- 중요 이벤트에 대한 로그 알림 설정
- 로그 접근 제어 및 감사

## 9. 문제 해결

배포 중 또는 배포 후 발생할 수 있는 일반적인 문제와 해결 방법입니다.

### 9.1 일반적인 배포 문제

| 문제 | 원인 | 해결 방법 |
|-----|------|----------|
| 이미지 풀 오류 | 레지스트리 인증 문제 | 인증 정보 확인 및 갱신 |
| 컨테이너 시작 실패 | 잘못된 환경 변수 | 환경 변수 구성 확인 |
| 데이터베이스 연결 오류 | 데이터베이스 자격 증명 문제 | 자격 증명 및 네트워크 연결 확인 |
| 리소스 부족 | CPU/메모리 한도 초과 | 리소스 할당량 조정 |

### 9.2 배포 로그 확인

문제 발생 시 다음 로그를 확인합니다:

```bash
# GitHub Actions 워크플로우 로그
# GitHub UI에서 확인 또는:
gh run view <run-id> --log

# 서버 애플리케이션 로그
ssh user@server "docker logs maintenance-api"

# 데이터베이스 마이그레이션 로그
ssh user@server "cat /opt/logs/migration.log"
```

### 9.3 상태 확인

서비스 상태를 확인하는 방법:

```bash
# 컨테이너 상태 확인
ssh user@server "docker ps -a"

# 헬스 체크 엔드포인트 호출
curl -v https://example.com/health

# 데이터베이스 연결 확인
ssh user@server "docker exec -it maintenance-db psql -U username -c '\l'"
```

### 9.4 롤백 결정

다음과 같은 상황에서는 롤백을 고려합니다:

- 주요 기능이 작동하지 않음
- 보안 취약점 발견
- 성능이 허용 가능한 수준 이하로 저하
- 데이터 무결성 문제 발생

롤백 결정은 영향 범위, 수정 난이도, 비즈니스 영향을 고려하여 내립니다.

## 10. 배포 체크리스트

### 10.1 배포 전 체크리스트

- [ ] 모든 테스트 통과 확인
- [ ] 코드 리뷰 완료
- [ ] 보안 스캔 결과 검토
- [ ] 성능 테스트 결과 검토
- [ ] 데이터베이스 마이그레이션 검증
- [ ] 롤백 계획 수립
- [ ] 사용자 알림 준비 (필요한 경우)

### 10.2 배포 중 체크리스트

- [ ] 배포 진행 상황 모니터링
- [ ] 데이터베이스 마이그레이션 성공 확인
- [ ] 서비스 상태 점검
- [ ] 로그 모니터링

### 10.3 배포 후 체크리스트

- [ ] 상태 페이지 확인
- [ ] 핵심 기능 테스트
- [ ] 사용자 경험 모니터링
- [ ] 성능 메트릭 검토
- [ ] 이상 징후 모니터링
- [ ] 배포 성공 확인 메시지 발송

## 11. 참고 자료

- [GitHub Actions 워크플로우 설명서](https://docs.github.com/en/actions)
- [Docker 컨테이너 문서](https://docs.docker.com/)
- [FastAPI 배포 가이드](https://fastapi.tiangolo.com/deployment/)
- [Alembic 마이그레이션 문서](https://alembic.sqlalchemy.org/)
- [Prometheus 모니터링 문서](https://prometheus.io/docs/)

## 12. 관련 문서

- [아키텍처 문서](./architecture.md)
- [개발 환경 설정 가이드](./setup.md)
- [API 문서](./api.md)
- [모니터링 설정 가이드](./monitoring.md)
- [문제 해결 가이드](./troubleshooting.md)
