#!/usr/bin/env python
"""
API 서버 실행 스크립트
모듈 임포트 문제를 해결하기 위한 간단한 스크립트
"""
import importlib
import logging
import os
import sys

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    """API 서버 실행"""
    logger.info("API 서버 시작 스크립트")

    # 현재 디렉토리를 시스템 경로에 추가
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)

    # 포트 설정
    os.environ["PORT"] = "8081"

    try:
        # 모듈 임포트
        logger.info("메인 모듈 임포트 시도...")
        import uvicorn
        from src.main import app

        # 서버 실행
        logger.info("API 서버 시작: 포트 8081")
        uvicorn.run(app, host="0.0.0.0", port=8081, log_level="info")
    except ImportError as e:
        logger.error(f"모듈 임포트 오류: {e}")
        logger.error("경로 정보:")
        for p in sys.path:
            logger.error(f"  - {p}")
    except Exception as e:
        logger.error(f"서버 시작 중 오류 발생: {e}")


if __name__ == "__main__":
    main()
