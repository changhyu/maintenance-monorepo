import logging
import time
from datetime import datetime
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from packages.api.src.core.monitoringlogger import logger
from packages.api.src.core.monitoringmetrics import RequestMetrics, metrics_collector

logger = logging.getLogger(__name__)


class MonitoringMiddleware(BaseHTTPMiddleware):
    """API 요청 모니터링 미들웨어"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 요청 시작 시간
        start_time = time.time()

        try:
            # 요청 처리
            response = await call_next(request)

            # 응답 시간 계산
            response_time = time.time() - start_time

            # 메트릭 기록
            metrics = RequestMetrics(
                path=request.url.path,
                method=request.method,
                status_code=response.status_code,
                response_time=response_time,
                timestamp=datetime.now(),
                user_id=(
                    request.state.user_id if hasattr(request.state, "user_id") else None
                ),
            )

            await metrics_collector.record_request(metrics)

            return response

        except Exception as e:
            # 에러 메트릭 기록
            metrics_collector.record_error(
                method=request.method,
                endpoint=request.url.path,
                error_type=type(e).__name__,
            )
            logger.error(f"요청 처리 중 오류 발생: {str(e)}")
            raise
