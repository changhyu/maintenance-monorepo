# Docker 컨테이너화 및 인프라 설정 가이드

이 문서는 Maintenance Monorepo 프로젝트의 Docker 컨테이너화 및 인프라 설정에 관한 가이드를 제공합니다. 이 가이드는 개발자, DevOps 엔지니어 및 운영 담당자를 대상으로 합니다.

## 목차

1. [Docker 인프라 아키텍처 개요](#1-docker-인프라-아키텍처-개요)
2. [개발 환경 설정](#2-개발-환경-설정)
3. [프로덕션 환경 설정](#3-프로덕션-환경-설정)
4. [컨테이너 관리 및 오케스트레이션](#4-컨테이너-관리-및-오케스트레이션)
5. [네트워킹 및 보안](#5-네트워킹-및-보안)
6. [CI/CD 통합](#6-cicd-통합)
7. [모니터링 및 로깅](#7-모니터링-및-로깅)
8. [문제 해결](#8-문제-해결)

## 1. Docker 인프라 아키텍처 개요

Maintenance Monorepo 프로젝트는 다음과 같은 Docker 인프라 아키텍처를 사용합니다:

```
+----------------------------------+
|         Docker Registry          |
+----------------------------------+
                |
                v
+----------------------------------+
|        Container Cluster         |
+----------------------------------+
    |        |        |        |
    v        v        v        v
+-------+ +-------+ +-------+ +-------+
| API   | | Front | | ML    | | Other |
| Svcs  | | End   | | Svcs  | | Svcs  |
+-------+ +-------+ +-------+ +-------+
    |        |        |        |
    v        v        v        v
+----------------------------------+
|       Shared Volumes/Data        |
+----------------------------------+
```

주요 구성 요소:

- **API 서비스**: 백엔드 API 컨테이너들 (FastAPI 기반)
- **프론트엔드**: 웹 및 모바일 인터페이스 (React, React Native)
- **ML 서비스**: 머신러닝 모델 및 관련 서비스
- **기타 서비스**: 캐시, 메시징, 기타 지원 서비스
- **공유 볼륨/데이터**: 지속적인 데이터 스토리지 및 서비스 간 공유 리소스

## 2. 개발 환경 설정

### 2.1 사전 요구사항

개발 환경 설정을 위한 사전 요구사항:

- Docker Desktop/Engine: v20.10.0 이상
- Docker Compose: v2.0.0 이상
- Git
- Make (선택 사항)

### 2.2 로컬 개발 환경 설정

**초기 설정**:

1. 저장소 클론 및 환경 설정:

```bash
# 저장소 클론
git clone https://github.com/your-org/maintenance-monorepo.git
cd maintenance-monorepo

# 개발 환경 설정
cp .env.example .env
# 필요한 값들 수정
```

2. 개발 환경 시작:

```bash
# Docker Compose를 사용한 서비스 시작
docker-compose up
```

특정 서비스만 시작하려면:

```bash
docker-compose up backend frontend
```

### 2.3 개발용 Docker Compose 설정

개발 환경을 위한 Docker Compose 설정:

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.api
    volumes:
      - ./packages/api:/app
      - ./packages/shared:/app/shared
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=development
      - DATABASE_URL=postgresql://user:password@db:5432/maintenance_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    volumes:
      - ./packages/frontend:/app
      - ./packages/shared:/app/shared
    ports:
      - "3000:3000"
    environment:
      - ENVIRONMENT=development
      - API_URL=http://backend:8000
    depends_on:
      - backend

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=maintenance_db
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

### 2.4 개발용 Dockerfile 예시

**Backend API Dockerfile**:

```dockerfile
# Dockerfile.api
FROM python:3.11-slim

WORKDIR /app

# 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 의존성 설치
COPY packages/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 개발 모드에서는 애플리케이션 코드를 복사하지 않음
# (볼륨을 통해 마운트됨)

# 환경 변수 설정
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 애플리케이션 실행
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**Frontend Dockerfile**:

```dockerfile
# Dockerfile.frontend
FROM node:18-alpine

WORKDIR /app

# 의존성 설치
COPY packages/frontend/package.json packages/frontend/package-lock.json ./
RUN npm ci

# 개발 모드에서는 애플리케이션 코드를 복사하지 않음
# (볼륨을 통해 마운트됨)

# 환경 변수 설정
ENV NODE_ENV=development

# 애플리케이션 실행
CMD ["npm", "run", "dev"]
```

## 3. 프로덕션 환경 설정

### 3.1 프로덕션 환경을 위한 Docker Compose

프로덕션 환경을 위한 Docker Compose 설정:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.api
      args:
        - ENVIRONMENT=production
    restart: always
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: '512M'
    networks:
      - backend-network
      - frontend-network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        - ENVIRONMENT=production
    restart: always
    environment:
      - NODE_ENV=production
      - API_URL=${API_URL}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: '512M'
    networks:
      - frontend-network

  gateway:
    build:
      context: .
      dockerfile: Dockerfile.gateway
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx:/etc/nginx/conf.d
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - frontend-network

networks:
  backend-network:
    driver: bridge
    internal: true
  frontend-network:
    driver: bridge
```

### 3.2 프로덕션용 Dockerfile 예시

**Backend API 프로덕션 Dockerfile**:

```dockerfile
# Dockerfile.api
FROM python:3.11-slim AS builder

WORKDIR /app

# 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 의존성 설치
COPY packages/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 최종 이미지
FROM python:3.11-slim

WORKDIR /app

# 필요한 런타임 패키지 설치
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# 빌더 단계에서 의존성 복사
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 애플리케이션 코드 복사
COPY packages/api /app
COPY packages/shared /app/shared

# 환경 변수 설정
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# 일반 사용자로 실행
RUN adduser --disabled-password --gecos '' appuser
USER appuser

# 애플리케이션 실행
CMD ["gunicorn", "main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

**Frontend 프로덕션 Dockerfile**:

```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS builder

WORKDIR /app

# 의존성 설치
COPY packages/frontend/package.json packages/frontend/package-lock.json ./
RUN npm ci

# 소스 코드 복사
COPY packages/frontend /app
COPY packages/shared /app/shared

# 애플리케이션 빌드
RUN npm run build

# 최종 이미지
FROM nginx:alpine

# 빌드된 에셋 복사
COPY --from=builder /app/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 환경 변수 설정
ENV NODE_ENV=production

# 포트 노출
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]
```

### 3.3 프로덕션 배포 방법

프로덕션 환경에 배포하는 방법:

```bash
# 프로덕션 변수 로드
set -a
source .env.prod
set +a

# 프로덕션 환경으로 배포
docker-compose -f docker-compose.prod.yml up -d --build
```

롤링 업데이트 방법:

```bash
# 새 이미지 빌드
docker-compose -f docker-compose.prod.yml build service_name

# 서비스 업데이트 (다운타임 없음)
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale service_name=3 service_name
```

## 4. 컨테이너 관리 및 오케스트레이션

### 4.1 컨테이너 리소스 관리

Docker 컨테이너의 리소스 제한 및 관리:

```yaml
services:
  service_name:
    deploy:
      resources:
        limits:
          cpus: '0.5'    # CPU 제한
          memory: '512M' # 메모리 제한
        reservations:
          cpus: '0.25'   # CPU 예약
          memory: '256M' # 메모리 예약
```

리소스 모니터링:

```bash
# 실행 중인 컨테이너 리소스 사용량 확인
docker stats
```

### 4.2 컨테이너 헬스 체크

컨테이너 헬스 체크 설정:

```yaml
services:
  service_name:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### 4.3 오케스트레이션 전략

**Docker Compose**를 사용한 오케스트레이션:

```bash
# 모든 서비스 재시작
docker-compose restart

# 특정 서비스만 재시작
docker-compose restart service_name

# 컨테이너 로그 확인
docker-compose logs -f service_name
```

**쿠버네티스 통합** (선택 사항):

```yaml
# kubernetes/deployment.yaml 예시
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
      - name: api
        image: your-registry/maintenance-backend:latest
        ports:
        - containerPort: 8000
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: database-url
```

## 5. 네트워킹 및 보안

### 5.1 컨테이너 네트워킹

Docker 네트워크 구성:

```yaml
networks:
  frontend-network:  # 외부 접근 가능 네트워크
    driver: bridge
  backend-network:   # 내부 서비스 네트워크
    driver: bridge
    internal: true   # 외부에서 접근 불가
  data-network:      # 데이터 서비스 네트워크
    driver: bridge
    internal: true
```

서비스별 네트워크 구성:

```yaml
services:
  frontend:
    networks:
      - frontend-network
  
  backend:
    networks:
      - frontend-network
      - backend-network
  
  database:
    networks:
      - backend-network
      - data-network
```

### 5.2 보안 설정

컨테이너 보안 강화:

```dockerfile
# 비권한 사용자로 실행
RUN adduser --disabled-password --gecos '' appuser
USER appuser

# 읽기 전용 파일시스템 사용
VOLUME ["/app/data"]
```

Docker Compose의 보안 설정:

```yaml
services:
  service_name:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
```

### 5.3 비밀 관리

Docker Compose에서의 비밀 관리:

```yaml
services:
  service_name:
    env_file:
      - .env.prod
    environment:
      - SENSITIVE_VAR=${SENSITIVE_VALUE}
```

Docker 비밀을 사용한 관리 (Swarm 모드):

```yaml
services:
  backend:
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

## 6. CI/CD 통합

### 6.1 GitHub Actions CI/CD 파이프라인

GitHub Actions를 사용한 CI/CD 파이프라인 예시:

```yaml
# .github/workflows/docker-build.yml
name: Docker Build and Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: your-registry.com
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - name: Build and push Backend API
      uses: docker/build-push-action@v4
      with:
        context: .
        file: ./Dockerfile.api
        push: ${{ github.event_name != 'pull_request' }}
        tags: your-registry.com/maintenance-backend:${{ github.sha }}
    
    - name: Build and push Frontend
      uses: docker/build-push-action@v4
      with:
        context: .
        file: ./Dockerfile.frontend
        push: ${{ github.event_name != 'pull_request' }}
        tags: your-registry.com/maintenance-frontend:${{ github.sha }}
```

### 6.2 자동화된 테스트 및 배포

자동화된 테스트 및 배포 워크플로우:

```yaml
# .github/workflows/deploy.yml
name: Test and Deploy

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Compose
      run: docker-compose -f docker-compose.test.yml up -d
    
    - name: Run Tests
      run: docker-compose -f docker-compose.test.yml run backend pytest
    
    - name: Cleanup
      run: docker-compose -f docker-compose.test.yml down
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy to Production
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /path/to/maintenance-monorepo
          git pull
          docker-compose -f docker-compose.prod.yml up -d --build
```

## 7. 모니터링 및 로깅

### 7.1 컨테이너 로깅 설정

Docker Compose에서의 로깅 설정:

```yaml
services:
  service_name:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

중앙 집중식 로깅:

```yaml
services:
  service_name:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "localhost:24224"
        tag: "docker.{{.Name}}"
```

### 7.2 모니터링 통합

Prometheus 및 Grafana 모니터링 설정:

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.45.0
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    networks:
      - monitoring-network
  
  grafana:
    image: grafana/grafana:10.0.0
    depends_on:
      - prometheus
    ports:
      - "3000:3000"
    networks:
      - monitoring-network
    volumes:
      - grafana_data:/var/lib/grafana
```

애플리케이션 메트릭 노출:

```yaml
services:
  backend:
    labels:
      - "prometheus.scrape=true"
      - "prometheus.port=8000"
      - "prometheus.path=/metrics"
```

## 8. 문제 해결

### 8.1 일반적인 문제 및 해결 방법

| 문제 | 증상 | 해결 방법 |
|------|------|-----------|
| 컨테이너가 시작되지 않음 | `docker-compose up` 실행 시 오류 | 로그 확인: `docker-compose logs service_name` |
| 네트워크 연결 문제 | 서비스 간 통신 불가 | 네트워크 확인: `docker network inspect network_name` |
| 리소스 부족 | 컨테이너 자동 재시작 또는 OOM | 리소스 확인: `docker stats` |
| 볼륨 마운트 오류 | 파일 접근 불가 | 볼륨 확인: `docker volume inspect volume_name` |
| 이미지 빌드 실패 | 빌드 프로세스 중 오류 | 캐시 없이 빌드: `docker-compose build --no-cache service_name` |

### 8.2 디버깅 팁

컨테이너 내부 접속:

```bash
docker-compose exec service_name bash
# 또는 
docker-compose exec service_name sh
```

로그 확인:

```bash
# 모든 로그 확인
docker-compose logs

# 특정 서비스 로그 실시간 확인
docker-compose logs -f service_name

# 최근 100줄만 확인
docker-compose logs --tail=100 service_name
```

네트워크 디버깅:

```bash
# 네트워크 목록 확인
docker network ls

# 특정 네트워크 정보 확인
docker network inspect network_name

# 컨테이너 네트워크 연결 테스트
docker-compose exec service_name ping other_service
```

---

문서 업데이트 날짜: 2025-04-26

## 부록: 참고 자료

- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 공식 문서](https://docs.docker.com/compose/)
- [Docker 보안 모범 사례](https://docs.docker.com/develop/security-best-practices/)
- [Docker 네트워킹 개요](https://docs.docker.com/network/)
