# 빌드 스테이지
FROM python:3.11-slim as builder

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Poetry 설치
RUN pip install poetry

# 의존성 파일 복사
COPY pyproject.toml poetry.lock ./

# 의존성 설치
RUN poetry config virtualenvs.create false && \
    poetry install --no-dev --no-interaction --no-ansi

# 실행 스테이지
FROM python:3.11-slim

WORKDIR /app

# 필요한 시스템 패키지만 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    tini \
    && rm -rf /var/lib/apt/lists/*

# 가상 환경에서 설치된 패키지 복사
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 애플리케이션 코드 복사
COPY src /app/src

# 환경 변수 설정
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    LOG_LEVEL=INFO

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# tini를 엔트리포인트로 사용
ENTRYPOINT ["/usr/bin/tini", "--"]

# 서버 실행
CMD ["python", "-m", "src.main"] 