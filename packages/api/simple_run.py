#!/usr/bin/env python
"""
API 서버 실행 스크립트
모듈 임포트 문제를 해결하기 위한 간단한 스크립트
"""
import importlib
import logging
import os
import sys
import traceback

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    """API 서버 실행"""
    logger.info("API 서버 시작 스크립트")

    # 현재 디렉토리를 시스템 경로에 추가
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    
    # 프로젝트 루트 디렉토리도 추가 (상위 디렉토리)
    project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
        logger.info(f"프로젝트 루트 경로 추가: {project_root}")

    # 포트 설정
    os.environ["PORT"] = "8081"
    
    # PYTHONPATH 환경 변수에도 추가
    python_path = os.environ.get('PYTHONPATH', '')
    if current_dir not in python_path:
        os.environ['PYTHONPATH'] = f"{current_dir}:{python_path}" if python_path else current_dir
        logger.info(f"PYTHONPATH 환경 변수 업데이트: {os.environ['PYTHONPATH']}")

    try:
        # 패키지 가용성 확인
        required_packages = ['uvicorn', 'fastapi']
        missing_packages = []
        
        for package in required_packages:
            try:
                importlib.import_module(package)
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            logger.error(f"필수 패키지가 설치되지 않았습니다: {', '.join(missing_packages)}")
            logger.error("pip install uvicorn fastapi 명령어로 설치하세요.")
            return 1
            
        # 임포트 경로 처리 헬퍼 로드
        try:
            logger.info("임포트 경로 처리 헬퍼 로드 중...")
            from src.core.import_helper import fix_import_paths
            fix_import_paths()
            logger.info("임포트 경로 처리기가 성공적으로 로드되었습니다.")
        except ImportError as e:
            logger.warning(f"임포트 경로 처리기 로드 실패: {e}")
            logger.warning("일부 모듈 임포트에 문제가 발생할 수 있습니다.")
            
        # 모듈 임포트
        logger.info("메인 모듈 임포트 시도...")
        import uvicorn
        from src.main import app

        # 서버 실행
        logger.info("API 서버 시작: 포트 8081")
        uvicorn.run(app, host="0.0.0.0", port=8081, log_level="info")
        return 0
    except ImportError as e:
        logger.error(f"모듈 임포트 오류: {e}")
        logger.error(traceback.format_exc())
        logger.error("경로 정보:")
        for p in sys.path:
            logger.error(f"  - {p}")
        return 1
    except Exception as e:
        logger.error(f"서버 시작 중 오류 발생: {e}")
        logger.error(traceback.format_exc())
        return 1


if __name__ == "__main__":
    sys.exit(main())
