# 모니터링 가이드

## 1. 개요

이 문서는 Maintenance Monorepo 프로젝트의 모니터링 시스템 설정 및 사용 방법을 설명합니다. 이 가이드는 개발자, DevOps 엔지니어, 시스템 관리자를 대상으로 합니다.

프로젝트는 다음과 같은 모니터링 도구를 사용합니다:

- **메트릭 수집**: Prometheus
- **시각화**: Grafana
- **알림**: Alertmanager
- **로깅**: ELK Stack

## 2. 모니터링 아키텍처

### 2.1 시스템 구성

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Prometheus     │────▶│  Grafana        │────▶│  Alertmanager   │
│  (메트릭 수집)  │     │  (시각화)       │     │  (알림)         │
│                 │     │                 │     │                 │
└────────┬────────┘     └─────────────────┘     └────────┬────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  API 서버       │     │  웹사이트       │     │  데이터베이스   │
│  (FastAPI)      │     │  (Next.js)      │     │  (PostgreSQL)   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 2.2 데이터 흐름

1. **메트릭 수집**:
   - Prometheus가 각 서비스에서 메트릭 수집
   - 15초 간격으로 스크랩

2. **시각화**:
   - Grafana가 Prometheus 데이터를 대시보드로 표시
   - 사용자 정의 패널 및 알림 설정

3. **알림**:
   - Alertmanager가 규칙 기반 알림 전송
   - Slack, 이메일, SMS 등으로 전달

## 3. 메트릭 수집

### 3.1 API 서버 메트릭

```python
from prometheus_client import Counter, Histogram

# 요청 수 카운터
requests_total = Counter('http_requests_total', 'Total HTTP requests')

# 응답 시간 히스토그램
response_time = Histogram('http_response_time_seconds', 'HTTP response time')

@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    response_time.observe(time.time() - start_time)
    requests_total.inc()
    return response
```

### 3.2 웹사이트 메트릭

```javascript
// Next.js API 라우트
export default function handler(req, res) {
  // 메트릭 수집
  const metrics = {
    page_load_time: performance.now(),
    user_agent: req.headers['user-agent'],
    // 기타 메트릭
  };

  // Prometheus로 전송
  fetch('http://prometheus:9090/metrics', {
    method: 'POST',
    body: JSON.stringify(metrics)
  });

  res.status(200).json({ status: 'ok' });
}
```

### 3.3 데이터베이스 메트릭

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    metrics_path: '/metrics'
```

## 4. 대시보드 설정

### 4.1 API 성능 대시보드

- **응답 시간**: 평균, 95th, 99th 백분위
- **요청 수**: 초당 요청 수
- **에러율**: HTTP 상태 코드별 비율
- **리소스 사용량**: CPU, 메모리, 디스크

### 4.2 웹사이트 성능 대시보드

- **페이지 로드 시간**: First Contentful Paint, Time to Interactive
- **사용자 행동**: 페이지 뷰, 세션 시간, 이탈률
- **에러 모니터링**: JavaScript 에러, API 실패
- **리소스 사용량**: 번들 크기, 이미지 최적화

### 4.3 데이터베이스 성능 대시보드

- **쿼리 성능**: 실행 시간, 실행 횟수
- **연결 수**: 활성/대기 연결
- **리소스 사용량**: CPU, 메모리, 디스크 I/O
- **복제 지연**: 마스터-슬레이브 지연 시간

## 5. 알림 설정

### 5.1 Alertmanager 설정

```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-notifications'

receivers:
- name: 'slack-notifications'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/...'
    channel: '#alerts'
```

### 5.2 알림 규칙

```yaml
# rules.yml
groups:
- name: example
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: High error rate on {{ $labels.instance }}
```

## 6. 로깅 설정

### 6.1 구조화된 로깅

```python
import structlog

logger = structlog.get_logger()

# 로그 메시지
logger.info("user_action", 
    user_id=user.id,
    action="login",
    status="success"
)
```

### 6.2 로그 수집

```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  paths:
    - /var/log/api/*.log
    - /var/log/website/*.log

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

## 7. 성능 모니터링

### 7.1 API 성능

- **응답 시간**: 95th 백분위 200ms 이하
- **에러율**: 1% 미만
- **동시 접속자**: 최대 1000명
- **처리량**: 초당 1000 요청

### 7.2 웹사이트 성능

- **First Contentful Paint**: 1.8초 이하
- **Time to Interactive**: 3.8초 이하
- **Speed Index**: 3.4초 이하
- **Lighthouse 점수**: 90점 이상

### 7.3 데이터베이스 성능

- **쿼리 실행 시간**: 95th 백분위 100ms 이하
- **연결 수**: 최대 100개
- **CPU 사용률**: 70% 미만
- **디스크 I/O**: 초당 1000 IOPS 미만

## 8. 문제 해결

### 8.1 일반적인 문제

1. **메트릭 수집 실패**:
   - Prometheus 설정 확인
   - 네트워크 연결 확인
   - 타겟 상태 확인

2. **알림 전송 실패**:
   - Alertmanager 설정 확인
   - 수신자 설정 확인
   - 네트워크 연결 확인

3. **대시보드 로딩 실패**:
   - Grafana 설정 확인
   - 데이터 소스 연결 확인
   - 권한 설정 확인

### 8.2 디버깅 도구

- **Prometheus 쿼리**:
  ```promql
  rate(http_requests_total[5m])
  histogram_quantile(0.95, rate(http_response_time_seconds_bucket[5m]))
  ```

- **Grafana 탐색기**:
  - 메트릭 브라우저
  - 로그 탐색기
  - 트레이스 탐색기

## 9. 참고 자료

- [Prometheus 문서](https://prometheus.io/docs/)
- [Grafana 문서](https://grafana.com/docs/)
- [Alertmanager 문서](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [ELK Stack 문서](https://www.elastic.co/guide/index.html)
