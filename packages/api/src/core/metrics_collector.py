"""
메트릭 수집기 모듈
"""

from prometheus_client import Counter, Gauge, Histogram, Summary, Info
from prometheus_client.core import CollectorRegistry
import psutil
import logging

logger = logging.getLogger(__name__)

class MetricsCollector:
    """메트릭 수집기 클래스"""
    
    def __init__(self):
        self.registry = CollectorRegistry()
        
        # 시스템 메트릭
        self.cpu_usage = Gauge('system_cpu_usage_percent', 'CPU 사용률', registry=self.registry)
        self.memory_usage = Gauge('system_memory_usage_bytes', '메모리 사용량', registry=self.registry)
        self.disk_usage = Gauge('system_disk_usage_percent', '디스크 사용률', registry=self.registry)
        self.load_average = Gauge('system_load_average', '시스템 로드 애버리지', registry=self.registry)
        
        # API 메트릭
        self.http_requests_total = Counter('http_requests_total', 'HTTP 요청 수',
                                         ['method', 'endpoint', 'status'], registry=self.registry)
        self.http_request_duration_seconds = Histogram('http_request_duration_seconds',
                                                     'HTTP 요청 처리 시간',
                                                     ['method', 'endpoint'],
                                                     registry=self.registry)
        
        # 데이터베이스 메트릭
        self.db_connections = Gauge('db_connections_current', '현재 데이터베이스 연결 수',
                                  registry=self.registry)
        self.db_query_duration_seconds = Histogram('db_query_duration_seconds',
                                                 '데이터베이스 쿼리 실행 시간',
                                                 registry=self.registry)
        
        # 캐시 메트릭
        self.cache_hits_total = Counter('cache_hits_total', '캐시 히트 수', registry=self.registry)
        self.cache_misses_total = Counter('cache_misses_total', '캐시 미스 수', registry=self.registry)
        self.cache_memory_usage = Gauge('cache_memory_usage_bytes', '캐시 메모리 사용량',
                                      registry=self.registry)
        
        # 비즈니스 메트릭
        self.maintenance_completion_time = Histogram('maintenance_completion_time_hours',
                                                   '정비 완료 시간',
                                                   registry=self.registry)
        self.parts_inventory_level = Gauge('parts_inventory_level_percent',
                                         '부품 재고 수준',
                                         ['part_id'],
                                         registry=self.registry)
        self.customer_wait_time = Histogram('customer_wait_time_minutes',
                                          '고객 대기 시간',
                                          registry=self.registry)
        
        # 보안 메트릭
        self.login_failures = Counter('login_failures_total',
                                    '로그인 실패 수',
                                    ['ip_address'],
                                    registry=self.registry)
        self.permission_denials = Counter('permission_denials_total',
                                        '권한 거부 수',
                                        ['endpoint'],
                                        registry=self.registry)

        # 토큰 관련 메트릭
        self.token_operations = Counter('token_operations_total',
                                      '토큰 작업 수',
                                      ['operation'],
                                      registry=self.registry)

        # 활성 사용자 수
        self.active_users = Gauge('active_users_total',
                                '활성 사용자 수',
                                registry=self.registry)

        # API 정보
        self.api_info = Gauge('api_info',
                            'API 정보',
                            ['version', 'environment'],
                            registry=self.registry)

    def update_system_metrics(self):
        """시스템 메트릭 업데이트"""
        try:
            self.cpu_usage.set(psutil.cpu_percent())
            memory = psutil.virtual_memory()
            self.memory_usage.set(memory.used)
            disk = psutil.disk_usage('/')
            self.disk_usage.set(disk.percent)
            self.load_average.set(psutil.getloadavg()[0])
        except Exception as e:
            logger.error(f"시스템 메트릭 업데이트 중 오류 발생: {str(e)}")

    def track_request(self, method: str, endpoint: str, status_code: int):
        """HTTP 요청 추적"""
        self.http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status=status_code
        ).inc()

    def track_db_query(self, duration: float):
        """데이터베이스 쿼리 실행 시간 추적"""
        self.db_query_duration_seconds.observe(duration)

    def update_db_connections(self, connections: int):
        """데이터베이스 연결 수 업데이트"""
        self.db_connections.set(connections)

    def track_cache_operation(self, hit: bool):
        """캐시 작업 추적"""
        if hit:
            self.cache_hits_total.inc()
        else:
            self.cache_misses_total.inc()

    def track_maintenance_completion(self, duration_hours: float):
        """정비 완료 시간 추적"""
        self.maintenance_completion_time.observe(duration_hours)

    def update_parts_inventory(self, part_id: str, level: float):
        """부품 재고 수준 업데이트"""
        self.parts_inventory_level.labels(part_id=part_id).set(level)

    def track_customer_wait_time(self, minutes: float):
        """고객 대기 시간 추적"""
        self.customer_wait_time.observe(minutes)

    def track_login_failure(self, ip_address: str):
        """로그인 실패 추적"""
        self.login_failures.labels(ip_address=ip_address).inc()

    def track_permission_denial(self, endpoint: str):
        """권한 거부 추적"""
        self.permission_denials.labels(endpoint=endpoint).inc()

# 전역 메트릭 수집기 인스턴스
metrics_collector = MetricsCollector() 