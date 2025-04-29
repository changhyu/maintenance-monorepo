# 차량 정비 관리 시스템 Docker 환경

이 디렉토리는 차량 정비 관리 시스템의 Docker 환경 설정 파일들을 포함하고 있습니다.

## 디렉토리 구조

```
docker/
├── grafana/             # Grafana 설정
│   └── provisioning/    # Grafana 프로비저닝 설정
│       ├── dashboards/  # 대시보드 설정
│       └── datasources/ # 데이터 소스 설정
├── nginx/               # Nginx 설정
│   ├── frontend.conf    # 프론트엔드 서비스를 위한 Nginx 설정
│   └── env.sh           # 환경 변수 처리 스크립트
├── postgres/            # PostgreSQL 설정
├── prometheus/          # Prometheus 설정
│   └── prometheus.yml   # Prometheus 설정 파일
├── promtail/            # Promtail 설정
│   └── promtail-config.yml # Promtail 설정 파일
├── redis/               # Redis 설정
├── secrets/             # 보안 시크릿 파일 (git에 포함하지 않음)
└── traefik/             # Traefik 로드밸런서 설정 (프로덕션)
```

## 설정 파일 설명

### Nginx

- `frontend.conf`: 프론트엔드 서비스를 위한 Nginx 설정 파일입니다. 정적 파일 서빙, API 프록시, 보안 헤더 등이 설정되어 있습니다.
- `env.sh`: 빌드 시 환경 변수 값을 정적 파일에 주입하는 스크립트입니다.

### Prometheus

- `prometheus.yml`: 모니터링할 대상 서비스와 메트릭 수집 설정이 포함되어 있습니다.

### Grafana

- `provisioning/datasources/datasource.yml`: Prometheus와 Loki 데이터 소스 설정이 포함되어 있습니다.
- `provisioning/dashboards/dashboard.yml`: 대시보드 프로비저닝 설정이 포함되어 있습니다.

### Promtail

- `promtail-config.yml`: 각 서비스의 로그 파일 수집 설정이 포함되어 있습니다.

## 사용 방법

### 개발 환경 실행

개발 환경에서는 다음 명령어를 사용하여 서비스를 실행할 수 있습니다:

```bash
# 모든 서비스 실행
docker-compose up

# 특정 서비스만 실행
docker-compose up api db redis

# 백그라운드에서 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f [service_name]
```

### 프로덕션 환경 실행

프로덕션 환경에서는 다음 명령어를 사용하여 서비스를 실행할 수 있습니다:

```bash
# 프로덕션 설정으로 실행
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 특정 서비스만 업데이트
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps [service_name]
```

### 보안 설정 적용

Docker 환경 보안 설정을 위해 다음 스크립트를 실행할 수 있습니다:

```bash
sudo ./docker-security/secure-docker-setup.sh
```

## 모니터링 대시보드 접근

- Grafana: http://localhost:3000 (기본 계정: admin/admin)
- Prometheus: http://localhost:9090

## 로그 확인

- Grafana Loki: Grafana 대시보드 내 "Explore" 메뉴에서 확인 가능
- 직접 파일 확인: `docker-compose exec [service_name] cat /app/logs/application.log`

## 볼륨 관리

Docker 볼륨은 데이터 지속성을 위해 사용됩니다. 다음 명령어로 볼륨을 관리할 수 있습니다:

```bash
# 볼륨 목록 확인
docker volume ls

# 특정 볼륨 상세 정보 확인
docker volume inspect [volume_name]

# 미사용 볼륨 정리
docker volume prune

# 특정 볼륨 백업
docker run --rm -v [volume_name]:/source -v $(pwd):/backup alpine tar -czf /backup/[volume_name]_backup.tar.gz -C /source .

# 볼륨 복원
docker run --rm -v [volume_name]:/target -v $(pwd):/backup alpine sh -c "rm -rf /target/* && tar -xzf /backup/[volume_name]_backup.tar.gz -C /target"
```

## Docker 이미지 관리

프로젝트에서 사용하는 Docker 이미지를 관리하기 위한 도구와 명령어입니다:

```bash
# 이미지 빌드
docker-compose build

# 특정 서비스 이미지 빌드
docker-compose build [service_name]

# 캐시 없이 이미지 다시 빌드
docker-compose build --no-cache [service_name]

# 이미지 보안 스캔
./docker-security/docker-scan.sh Dockerfile.[service_name]

# 미사용 이미지 정리
docker image prune
```

## 네트워크 구성

서비스 간 통신은 `maintenance-network` 네트워크를 통해 이루어집니다. 각 서비스는 서비스 이름으로 서로를 참조할 수 있습니다.

```bash
# 네트워크 목록 확인
docker network ls

# 네트워크 상세 정보 확인
docker network inspect maintenance-network

# 컨테이너 간 연결 테스트
docker-compose exec api ping redis
```

## 컨테이너 리소스 제한

프로덕션 환경에서는 각 컨테이너의 리소스 사용량을 제한하여 안정적인 운영을 보장합니다:

- `docker-compose.prod.yml` 파일에서 각 서비스별 CPU 및 메모리 제한 설정
- 리소스 모니터링은 Grafana 대시보드에서 확인 가능

## 알림 설정

시스템 이상 발생 시 알림을 받을 수 있도록 Grafana 알림 규칙을 설정할 수 있습니다:

1. Grafana에 로그인
2. Alerting > Alert rules 메뉴로 이동
3. "New alert rule" 버튼 클릭
4. 조건 및 알림 채널 설정 (이메일, Slack 등)

## 문제 해결 가이드

### 컨테이너가 시작되지 않는 경우

```bash
# 컨테이너 로그 확인
docker-compose logs [service_name]

# 컨테이너 상태 확인
docker-compose ps

# 컨테이너 재시작
docker-compose restart [service_name]
```

### 네트워크 연결 문제

```bash
# 네트워크 연결 확인
docker-compose exec [service_name] ping [target_service]

# DNS 확인
docker-compose exec [service_name] nslookup [target_service]
```

### 볼륨 마운트 문제

```bash
# 볼륨 마운트 확인
docker-compose exec [service_name] ls -la /app/[directory]

# 볼륨 권한 확인
docker-compose exec [service_name] stat -c '%U:%G' /app/[directory]
```

## 모범 사례

1. 정기적으로 이미지 보안 스캔 수행
2. 불필요한 컨테이너 및 이미지 정리
3. 중요 데이터는 볼륨 백업 수행
4. 프로덕션 환경에서는 리소스 제한 설정
5. 로그 및 모니터링 활용

## 보안 고려사항

1. 시크릿 파일은 `.gitignore`에 추가하여 Git에 포함되지 않도록 함
2. 컨테이너 내부에서 루트 사용자 대신 일반 사용자 사용
3. 불필요한 패키지 설치 최소화
4. 이미지 레이어 수 최소화
5. 정기적인 이미지 업데이트 수행
