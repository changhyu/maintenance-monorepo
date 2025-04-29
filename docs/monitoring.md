# 모니터링 및 알림 설정 가이드

이 문서는 Maintenance Monorepo 프로젝트의 모니터링 및 알림 시스템 설정에 관한 가이드를 제공합니다. 이 가이드는 개발자, DevOps 엔지니어 및 운영 담당자를 대상으로 합니다.

## 목차

1. [모니터링 아키텍처 개요](#1-모니터링-아키텍처-개요)
2. [모니터링 구성 요소](#2-모니터링-구성-요소)
3. [Prometheus 설정](#3-prometheus-설정)
4. [Grafana 대시보드 구성](#4-grafana-대시보드-구성)
5. [로그 수집 시스템 구성](#5-로그-수집-시스템-구성)
6. [알림 구성](#6-알림-구성)
7. [사용자 정의 메트릭 구현](#7-사용자-정의-메트릭-구현)
8. [모니터링 성능 최적화](#8-모니터링-성능-최적화)
9. [문제 해결](#9-문제-해결)

## 1. 모니터링 아키텍처 개요

Maintenance Monorepo 프로젝트는 다음과 같은 모니터링 아키텍처를 사용합니다:

```
                     +-------------------+
                     |   Alertmanager    |
                     +---------+---------+
                               |
                               | (알림 전송)
                               v
+------------------+  (메트릭) +-------------+  (로그)  +-----------------+
|  애플리케이션 서버  |--------->|  Prometheus  |<---------|   Loki/Promtail  |
+------------------+          +------+------+          +-----------------+
         |                           |                           |
         v                           v                           v
+------------------+          +--------------+          +-----------------+
|  노드 익스포터     |--------->|    Grafana    |<---------|  시스템 로그      |
+------------------+          +--------------+          +-----------------+
```

주요 구성 요소:

- **Prometheus**: 메트릭 수집 및 저장
- **Grafana**: 데이터 시각화 및 대시보드
- **Loki/Promtail**: 로그 수집 및 쿼리
- **Alertmanager**: 알림 관리 및 전송

## 2. 모니터링 구성 요소

### 2.1 기본 메트릭

다음과 같은 기본 메트릭을 수집합니다:

| 메트릭 유형 | 설명 | 수집 도구 |
|------------|------|----------|
| CPU 사용량 | 시스템 및 컨테이너별 CPU 사용률 | Node Exporter, cAdvisor |
| 메모리 사용량 | 시스템 및 컨테이너별 메모리 사용량 | Node Exporter, cAdvisor |
| 디스크 I/O | 디스크 읽기/쓰기 작업량 | Node Exporter |
| 네트워크 트래픽 | 인바운드/아웃바운드 네트워크 트래픽 | Node Exporter |
| 서비스 상태 | 서비스 가용성 및 상태 | Blackbox Exporter |

### 2.2 애플리케이션 메트릭

애플리케이션별 메트릭:

| 애플리케이션 | 메트릭 | 설명 |
|------------|--------|------|
| 백엔드 API | http_requests_total | 총 HTTP 요청 수 |
| 백엔드 API | http_request_duration_seconds | HTTP 요청 처리 시간 |
| 백엔드 API | http_request_exceptions_total | 예외 발생 횟수 |
| 프론트엔드 | page_load_time | 페이지 로드 시간 |
| 데이터베이스 | db_connections | 활성 DB 연결 수 |
| 데이터베이스 | db_query_duration_seconds | 쿼리 실행 시간 |

### 2.3 비즈니스 메트릭

비즈니스 관련 메트릭:

| 메트릭 | 설명 | 중요도 |
|--------|------|--------|
| active_users | 활성 사용자 수 | 높음 |
| maintenance_records_created | 생성된 정비 기록 수 | 중간 |
| api_error_rate | API 오류율 | 높음 |
| login_success_rate | 로그인 성공률 | 높음 |

## 3. Prometheus 설정

### 3.1 설치 및 기본 구성

Prometheus는 Docker Compose 또는 Kubernetes를 통해 배포됩니다.

**Docker Compose 설정 예시:**

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.42.0
    container_name: prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --web.console.libraries=/etc/prometheus/console_libraries
      - --web.console.templates=/etc/prometheus/consoles
      - --web.enable-lifecycle
    ports:
      - "9090:9090"
    restart: unless-stopped
    networks:
      - monitoring-network

  node-exporter:
    image: prom/node-exporter:v1.5.0
    container_name: node-exporter
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - --path.procfs=/host/proc
      - --path.sysfs=/host/sys
      - --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc|rootfs/var/lib/docker/containers|rootfs/var/lib/docker/overlay2|rootfs/run/docker/netns|rootfs/var/lib/docker/aufs)($$|/)
    ports:
      - "9100:9100"
    restart: unless-stopped
    networks:
      - monitoring-network

volumes:
  prometheus_data:

networks:
  monitoring-network:
    driver: bridge
```

**Prometheus 기본 구성 파일:**

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "node"
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: "backend-api"
    metrics_path: /metrics
    static_configs:
      - targets: ["backend-api:9999"]

  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]

  - job_name: "blackbox"
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://example.com/health
          - https://api.example.com/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

### 3.2 알림 규칙 설정

Prometheus 알림 규칙 예시:

```yaml
# prometheus/rules/alerts.yml
groups:
  - name: maintenance-alerts
    rules:
      - alert: HighCpuUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected ({{ $value }}% used)"
          description: "CPU usage is above 80% for more than 5 minutes on {{ $labels.instance }}"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected ({{ $value }}% used)"
          description: "Memory usage is above 85% for more than 5 minutes on {{ $labels.instance }}"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service {{ $labels.job }} has been down for more than 1 minute."

      - alert: HighApiErrorRate
        expr: sum(rate(http_request_exceptions_total[5m])) / sum(rate(http_requests_total[5m])) * 100 > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High API error rate ({{ $value }}%)"
          description: "API error rate is above 5% for more than 5 minutes"
```

### 3.3 서비스 디스커버리 설정

동적 환경을 위한 서비스 디스커버리 설정:

```yaml
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name
```

## 4. Grafana 대시보드 구성

### 4.1 설치 및 기본 구성

**Docker Compose 설정 예시:**

```yaml
# docker-compose.monitoring.yml (계속)
services:
  # ... 기존 서비스 ...
  
  grafana:
    image: grafana/grafana:9.4.7
    container_name: grafana
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=https://grafana.example.com
    ports:
      - "3000:3000"
    restart: unless-stopped
    networks:
      - monitoring-network
      
volumes:
  # ... 기존 볼륨 ...
  grafana_data:
```

### 4.2 데이터 소스 구성

**Prometheus 데이터 소스 설정:**

```yaml
# grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
```

### 4.3 대시보드 템플릿

기본 제공되는 대시보드 템플릿:

1. **시스템 개요 대시보드**: 시스템 리소스 사용량 (CPU, 메모리, 디스크, 네트워크)
2. **애플리케이션 성능 대시보드**: API 응답 시간, 오류율, 요청 수
3. **비즈니스 지표 대시보드**: 사용자 활동, 정비 기록 생성 등의 비즈니스 메트릭
4. **로그 대시보드**: 중요 로그 이벤트 시각화

### 4.4 예시 대시보드 JSON

**시스템 개요 대시보드 예시 (부분):**

```json
{
  "annotations": {
    "list": []
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fieldConfig": {},
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 2,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.5.5",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "exemplar": true,
          "expr": "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
          "interval": "",
          "legendFormat": "CPU Usage {{instance}}",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "CPU Usage",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "percent",
          "label": null,
          "logBase": 1,
          "max": "100",
          "min": "0",
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    }
  ],
  "schemaVersion": 27,
  "style": "dark",
  "tags": ["system", "overview"],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-6h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "System Overview",
  "uid": "system-overview",
  "version": 1
}
```

### 4.5 대시보드 자동 구성

대시보드를 자동으로 프로비저닝하기 위한 설정:

```yaml
# grafana/provisioning/dashboards/default.yml
apiVersion: 1

providers:
  - name: 'Default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/dashboards
```

## 5. 로그 수집 시스템 구성

### 5.1 Loki 설정

**Docker Compose 설정:**

```yaml
# docker-compose.monitoring.yml (계속)
services:
  # ... 기존 서비스 ...
  
  loki:
    image: grafana/loki:2.7.4
    container_name: loki
    volumes:
      - ./loki/local-config.yaml:/etc/loki/local-config.yaml
      - loki_data:/loki
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    networks:
      - monitoring-network

  promtail:
    image: grafana/promtail:2.7.4
    container_name: promtail
    volumes:
      - ./promtail/config.yml:/etc/promtail/config.yml
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped
    networks:
      - monitoring-network
      
volumes:
  # ... 기존 볼륨 ...
  loki_data:
```

**Loki 구성 파일:**

```yaml
# loki/local-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: false
  retention_period: 0s
```

### 5.2 Promtail 설정

**Promtail 구성 파일:**

```yaml
# promtail/config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*log

  - job_name: docker
    static_configs:
      - targets:
          - localhost
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*-json.log

  - job_name: containers
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
```

### 5.3 애플리케이션 로그 구성

**FastAPI 애플리케이션 로그 설정:**

```python
# backend/core/logging.py
import logging
import sys
import json
from typing import Dict, Any

class JSONFormatter(logging.Formatter):
    """JSON 형식의 로그 포맷터"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_record: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
            "logger": record.name
        }
        
        # 예외 정보 추가
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
            
        # 추가 필드 추가
        if hasattr(record, "extra"):
            log_record.update(record.extra)
            
        return json.dumps(log_record)
    
def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """애플리케이션 로깅 설정"""
    logger = logging.getLogger("app")
    logger.setLevel(getattr(logging, log_level))
    
    # 콘솔 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JSONFormatter())
    logger.addHandler(console_handler)
    
    # 파일 핸들러
    file_handler = logging.FileHandler("app.log")
    file_handler.setFormatter(JSONFormatter())
    logger.addHandler(file_handler)
    
    return logger
```

## 6. 알림 구성

### 6.1 Alertmanager 설정

**Docker Compose 설정:**

```yaml
# docker-compose.monitoring.yml (계속)
services:
  # ... 기존 서비스 ...
  
  alertmanager:
    image: prom/alertmanager:v0.25.0
    container_name: alertmanager
    volumes:
      - ./alertmanager/config.yml:/etc/alertmanager/config.yml
      - alertmanager_data:/alertmanager
    ports:
      - "9093:9093"
    restart: unless-stopped
    networks:
      - monitoring-network
      
volumes:
  # ... 기존 볼륨 ...
  alertmanager_data:
```

**Alertmanager 구성 파일:**

```yaml
# alertmanager/config.yml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alerts@example.com'
  smtp_auth_password: 'your_password'
  smtp_require_tls: true

route:
  group_by: ['alertname', 'job', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'team-email'
  routes:
    - match:
        severity: critical
      receiver: 'team-pager'
      repeat_interval: 1h
      continue: true
    - match:
        severity: warning
      receiver: 'team-email'
      continue: true

receivers:
  - name: 'team-email'
    email_configs:
      - to: 'team@example.com'
        send_resolved: true
        
  - name: 'team-pager'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
        channel: '#alerts'
        send_resolved: true
        icon_emoji: ':rotating_light:'
        title: "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"
        text: "{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}"

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

### 6.2 Slack 알림 설정

Slack 알림 설정 방법:

1. Slack 워크스페이스에서 Incoming Webhook 앱을 설치
2. 알림을 받을 채널 선택
3. Webhook URL 생성 및 복사
4. Alertmanager 구성 파일에 Slack Webhook URL 추가

**Slack 웹훅 설정:**

```yaml
receivers:
  - name: 'slack-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
        channel: '#alerts'
        send_resolved: true
        icon_emoji: ':rotating_light:'
        title: "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"
        text: "{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}"
        actions:
          - type: button
            text: 'View in Grafana'
            url: 'https://grafana.example.com/explore'
```

### 6.3 이메일 알림 설정

이메일 알림 설정 방법:

1. SMTP 서버 정보 준비 (호스트, 포트, 인증 정보)
2. Alertmanager 구성 파일에 SMTP 설정 추가
3. 알림 수신자 및 발신자 이메일 주소 설정

**이메일 알림 템플릿 예시:**

```html
<!-- alertmanager/templates/email.tmpl -->
{{ define "email.default.subject" }}[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}{{ end }}

{{ define "email.default.html" }}
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Alert: {{ .CommonLabels.alertname }}</title>
</head>
<body>
    <h1>{{ .CommonLabels.alertname }}</h1>
    <p><strong>Status:</strong> {{ .Status | toUpper }}</p>
    <p><strong>Severity:</strong> {{ .CommonLabels.severity }}</p>
    
    <h2>Alerts</h2>
    <ul>
    {{ range .Alerts }}
        <li>
            <p><strong>Summary:</strong> {{ .Annotations.summary }}</p>
            <p><strong>Description:</strong> {{ .Annotations.description }}</p>
            <p><strong>Start:</strong> {{ .StartsAt }}</p>
            {{ if .EndsAt }}
            <p><strong>End:</strong> {{ .EndsAt }}</p>
            {{ end }}
        </li>
    {{ end }}
    </ul>
    
    <p>View in <a href="https://grafana.example.com">Grafana</a></p>
</body>
</html>
{{ end }}
```

### 6.4 PagerDuty 통합

24/7 당직 알림을 위한 PagerDuty 통합:

```yaml
# alertmanager/config.yml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'your_pagerduty_service_key'
        send_resolved: true
        description: '{{ .CommonAnnotations.summary }}'
        severity: >-
          {{- if eq .CommonLabels.severity "critical" -}}
            critical
          {{- else if eq .CommonLabels.severity "warning" -}}
            warning
          {{- else -}}
            info
          {{- end -}}
        details:
          description: '{{ .CommonAnnotations.description }}'
          instance: '{{ .CommonLabels.instance }}'
          job: '{{ .CommonLabels.job }}'
```

## 7. 사용자 정의 메트릭 구현

### 7.1 FastAPI 애플리케이션 메트릭

FastAPI 애플리케이션에 Prometheus 메트릭을 추가하는 방법:

```python
# backend/core/metrics.py
from prometheus_client import Counter, Histogram, Info, Gauge
from prometheus_client import make_asgi_app

# 요청 카운터
http_requests_total = Counter(
    'http_requests_total', 
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# 요청 처리 시간
http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0)
)

# 활성 사용자 수
active_users_gauge = Gauge(
    'active_users',
    'Number of active users'
)

# 애플리케이션 정보
app_info = Info(
    'app_info',
    'Application information'
)

# 메트릭 엔드포인트 생성
metrics_app = make_asgi_app()

# FastAPI 애플리케이션에 미들웨어 추가
def setup_metrics(app):
    @app.middleware("http")
    async def metrics_middleware(request, call_next):
        method = request.method
        path = request.url.path
        
        # /metrics 엔드포인트는 계측하지 않음
        if path == "/metrics":
            return await call_next(request)

        start_time = time.time()
        
        # 요청 처리
        response = await call_next(request)
        
        # 요청 처리 시간 기록
        duration = time.time() - start_time
        http_request_duration_seconds.labels(method=method, endpoint=path).observe(duration)
        
        # 요청 카운트 증가
        status = response.status_code
        http_requests_total.labels(method=method, endpoint=path, status=status).inc()
        
        return response
    
    # 애플리케이션 정보 설정
    app_info.info({
        'version': '1.0.0',
        'environment': os.getenv('ENVIRONMENT', 'development')
    })
    
    # 메트릭 엔드포인트 마운트
    app.mount("/metrics", metrics_app)
    
    return app
```

### 7.2 React 프론트엔드 메트릭

React 애플리케이션의 성능 메트릭 수집:

```javascript
// frontend/src/utils/metrics.js
import axios from 'axios';

// 페이지 로드 시간 측정 및 보고
export const reportPageLoadTime = (page) => {
  const navigationEntry = window.performance.timing;
  const loadTime = navigationEntry.loadEventEnd - navigationEntry.navigationStart;
  
  axios.post('/api/metrics/page-load', {
    page,
    loadTime
  }).catch(error => console.error('Failed to report metrics:', error));
};

// 사용자 상호작용 측정 및 보고
export const reportUserInteraction = (action, duration) => {
  axios.post('/api/metrics/user-interaction', {
    action,
    duration
  }).catch(error => console.error('Failed to report metrics:', error));
};

// 컴포넌트 렌더링 시간 측정을 위한 HOC
export const withPerformanceTracking = (WrappedComponent, componentName) => {
  return class WithPerformanceTracking extends React.Component {
    componentDidMount() {
      this.mountTime = performance.now();
    }
    
    componentDidUpdate() {
      const renderTime = performance.now() - this.mountTime;
      axios.post('/api/metrics/component-render', {
        component: componentName,
        renderTime
      }).catch(error => console.error('Failed to report metrics:', error));
    }
    
    render() {
      return <WrappedComponent {...this.props} />;
    }
  };
};
```

### 7.3 비즈니스 메트릭 구현

비즈니스 로직 내 메트릭 수집 예시:

```python
# backend/core/services/maintenance.py
from prometheus_client import Counter, Histogram, Gauge

# 정비 기록 생성 카운터
maintenance_records_created = Counter(
    'maintenance_records_created',
    'Number of maintenance records created',
    ['type', 'priority']
)

# 정비 작업 완료 시간
maintenance_completion_time = Histogram(
    'maintenance_completion_time_days',
    'Time to complete maintenance tasks in days',
    ['type', 'priority'],
    buckets=(1, 2, 3, 5, 7, 14, 30, 60, 90)
)

# 대기 중인 정비 작업 수
pending_maintenance_tasks = Gauge(
    'pending_maintenance_tasks',
    'Number of pending maintenance tasks',
    ['type', 'priority']
)

class MaintenanceService:
    def create_record(self, data):
        # 기록 생성 로직
        record = self.db.create_maintenance_record(data)
        
        # 메트릭 업데이트
        maintenance_records_created.labels(
            type=data['type'],
            priority=data['priority']
        ).inc()
        
        # 대기 중인 작업 수 업데이트
        pending_maintenance_tasks.labels(
            type=data['type'],
            priority=data['priority']
        ).inc()
        
        return record
    
    def complete_task(self, task_id, completion_data):
        # 작업 완료 로직
        task = self.db.get_task(task_id)
        task.complete(completion_data)
        
        # 작업 완료 시간 계산
        completion_time = (task.completed_at - task.created_at).days
        maintenance_completion_time.labels(
            type=task.type,
            priority=task.priority
        ).observe(completion_time)
        
        # 대기 중인 작업 수 감소
        pending_maintenance_tasks.labels(
            type=task.type,
            priority=task.priority
        ).dec()
        
        return task
```

## 8. 모니터링 성능 최적화

### 8.1 Prometheus 스토리지 최적화

Prometheus 스토리지 관리 및 최적화 방법:

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

storage:
  tsdb:
    path: /prometheus
    retention.time: 15d     # 데이터 보존 기간 설정
    retention.size: 50GB    # 최대 스토리지 사용량 설정
    wal_compression: true   # WAL 압축 활성화
```

### 8.2 Grafana 리소스 사용량 최적화

Grafana 성능 최적화를 위한 설정:

```ini
# grafana/grafana.ini
[server]
# 최대 연결 수 설정
max_connections = 100

[dashboards]
# 대시보드 버전 정리
versions_to_keep = 5

[alerting]
# 알림 평가 간격 조정
evaluation_timeout_seconds = 30
notification_timeout_seconds = 30
max_attempts = 3

[rendering]
# 이미지 렌더링 최적화
concurrent_render_limit = 5
```

### 8.3 로그 수집 최적화

Loki 및 Promtail 성능 최적화:

```yaml
# loki/local-config.yaml
limits_config:
  # 샘플 속도 제한 설정
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
  # 동시 테일 요청 제한
  max_concurrent_tail_requests: 20
  # 쿼리 최적화
  max_entries_limit_per_query: 10000
  max_query_parallelism: 32
```

```yaml
# promtail/config.yml
limits_config:
  # 최대 배치 크기
  max_batch_size: 1048576  # 1MB
  # 최대 배치 대기 시간
  max_batch_wait: 1s
  # 라벨 제한
  max_label_name_length: 1024
  max_label_value_length: 2048
```

### 8.4 알림 최적화

Alertmanager 성능 최적화:

```yaml
# alertmanager/config.yml
global:
  # 알림 유지 기간 제한
  resolve_timeout: 5m
  # 처리량 향상을 위한 HTTP 클라이언트 설정
  http_config:
    idle_conn_timeout: 5m
    max_idle_conns_per_host: 100

route:
  # 알림 그룹화 최적화
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  # 그룹화 전략 최적화
  group_by: ['alertname', 'job', 'severity']
```

## 9. 문제 해결

### 9.1 일반적인 문제 및 해결 방법

| 문제 | 증상 | 해결 방법 |
|------|------|----------|
| Prometheus 데이터 손실 | 특정 시간대 데이터 누락 | 1. TSDB 디렉토리 권한 확인<br>2. 디스크 공간 확인<br>3. WAL 복구 실행 |
| Grafana 대시보드 로딩 느림 | 대시보드 로딩에 10초 이상 소요 | 1. 복잡한 쿼리 간소화<br>2. 시간 범위 축소<br>3. 패널 수 줄이기 |
| 알림 지연 | 알림이 늦게 도착하거나 누락됨 | 1. Alertmanager 로그 확인<br>2. 네트워크 연결 확인<br>3. 알림 설정 재검토 |
| 메트릭 수집 실패 | 타겟 상태가 'down'으로 표시됨 | 1. 타겟 서비스 확인<br>2. 네트워크 연결 확인<br>3. 방화벽 설정 확인 |
| 로그 누락 | 로그가 Loki에 누락됨 | 1. Promtail 로그 확인<br>2. 파일 경로 및 권한 확인<br>3. 라벨 설정 확인 |

### 9.2 프로메테우스 문제 해결

**디버깅 명령어:**

```bash
# TSDB 일관성 확인
prometheus check-config /etc/prometheus/prometheus.yml

# 디스크 사용량 확인
du -sh /path/to/prometheus/data

# 타겟 상태 확인 (API 사용)
curl -s http://localhost:9090/api/v1/targets | jq .

# 알림 규칙 상태 확인
curl -s http://localhost:9090/api/v1/rules | jq .
```

### 9.3 Grafana 문제 해결

**디버깅 명령어:**

```bash
# Grafana 상태 확인
curl -s http://localhost:3000/api/health

# 데이터 소스 상태 확인
curl -s -u admin:password http://localhost:3000/api/datasources

# 대시보드 목록 가져오기
curl -s -u admin:password http://localhost:3000/api/search
```

### 9.4 로그 문제 해결

**Loki 및 Promtail 디버깅:**

```bash
# Loki 상태 확인
curl -s http://localhost:3100/ready

# Loki 메트릭 확인
curl -s http://localhost:3100/metrics

# Promtail 상태 확인
curl -s http://localhost:9080/ready

# Promtail 타겟 확인
curl -s http://localhost:9080/targets
```

### 9.5 알림 문제 해결

**Alertmanager 디버깅:**

```bash
# 알림 상태 확인
curl -s http://localhost:9093/api/v2/alerts

# 사일런스 확인
curl -s http://localhost:9093/api/v2/silences

# 수신자 상태 확인
curl -s http://localhost:9093/api/v2/status
```

---

문서 업데이트 날짜: 2023-12-01

```
