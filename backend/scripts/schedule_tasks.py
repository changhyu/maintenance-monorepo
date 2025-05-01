#!/usr/bin/env python
"""
작업 스케줄링 스크립트

이 스크립트는 apscheduler를 사용하여 주기적으로 실행해야 하는 작업을 스케줄링합니다.
- Git 작업 로그 정리
- 데이터베이스 백업
- 세션 정리
- 기타 유지보수 작업

이 스크립트는 백그라운드 프로세스나 서비스로 실행되어야 합니다.

사용법:
    python -m backend.scripts.schedule_tasks
"""

import os
import sys
import logging
import argparse
import time
import datetime
from pathlib import Path
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.executors.pool import ThreadPoolExecutor, ProcessPoolExecutor
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.triggers.cron import CronTrigger
import subprocess
import signal

# 상위 디렉토리를 파이썬 경로에 추가
parent_dir = str(Path(__file__).parent.parent.parent)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from backend.core.config import settings
from backend.core.logger import get_logger

# 로거 설정
logger = get_logger("task_scheduler")

# 종료 플래그
SHUTDOWN = False

def cleanup_git_logs():
    """Git 작업 로그 정리 작업을 실행합니다."""
    logger.info("Git 작업 로그 정리 작업 시작")
    
    try:
        script_path = os.path.join(os.path.dirname(__file__), "cleanup_git_logs.py")
        cmd = [sys.executable, script_path, "--days", "30", "--archive"]
        
        # 스크립트 실행
        result = subprocess.run(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            universal_newlines=True,
            check=False
        )
        
        if result.returncode == 0:
            logger.info("Git 작업 로그 정리 작업 성공")
            logger.debug(result.stdout)
        else:
            logger.error(f"Git 작업 로그 정리 작업 실패 (코드: {result.returncode})")
            logger.error(result.stderr)
            
    except Exception as e:
        logger.error(f"Git 작업 로그 정리 작업 실행 중 오류 발생: {str(e)}", exc_info=True)
    
    logger.info("Git 작업 로그 정리 작업 완료")

def database_backup():
    """데이터베이스 백업 작업을 실행합니다."""
    logger.info("데이터베이스 백업 작업 시작")
    
    try:
        # SQLite 데이터베이스인 경우
        if settings.DATABASE_URL.startswith("sqlite"):
            db_path = settings.DATABASE_URL.replace("sqlite:///", "")
            backup_dir = os.path.join(parent_dir, "backups")
            
            # 백업 디렉토리 생성
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)
                
            # 타임스탬프 생성
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(backup_dir, f"db_backup_{timestamp}.sqlite")
            
            # 백업 명령 실행
            import shutil
            shutil.copy2(db_path, backup_file)
            logger.info(f"데이터베이스가 {backup_file}에 백업되었습니다.")
            
        # PostgreSQL 데이터베이스인 경우
        elif settings.DATABASE_URL.startswith("postgresql"):
            # PostgreSQL 연결 파라미터 추출
            from urllib.parse import urlparse
            url = urlparse(settings.DATABASE_URL)
            
            # 백업 디렉토리 생성
            backup_dir = os.path.join(parent_dir, "backups")
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)
                
            # 타임스탬프 생성
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(backup_dir, f"db_backup_{timestamp}.sql")
            
            # pg_dump 명령 실행
            env = os.environ.copy()
            env["PGPASSWORD"] = url.password or ""
            
            # 명령 구성
            hostname = url.hostname or "localhost"
            port = url.port or 5432
            username = url.username or "postgres"
            database = url.path[1:]  # 첫 번째 '/' 제거
            
            cmd = [
                "pg_dump",
                "-h", hostname,
                "-p", str(port),
                "-U", username,
                "-F", "c",  # 압축 형식
                "-b",  # 이진 형식
                "-v",  # 상세 출력
                "-f", backup_file,
                database
            ]
            
            # 명령 실행
            result = subprocess.run(
                cmd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                check=False
            )
            
            if result.returncode == 0:
                logger.info(f"데이터베이스가 {backup_file}에 백업되었습니다.")
            else:
                logger.error(f"데이터베이스 백업 실패: {result.stderr}")
        
        else:
            logger.warning(f"지원되지 않는 데이터베이스 유형: {settings.DATABASE_URL}")
            
    except Exception as e:
        logger.error(f"데이터베이스 백업 작업 중 오류 발생: {str(e)}", exc_info=True)
    
    logger.info("데이터베이스 백업 작업 완료")

def cleanup_sessions():
    """만료된 세션을 정리합니다."""
    logger.info("세션 정리 작업 시작")
    # 세션 정리 로직 구현
    logger.info("세션 정리 작업 완료")

def handle_signal(signum, frame):
    """시그널 핸들러"""
    global SHUTDOWN
    if signum in (signal.SIGINT, signal.SIGTERM):
        logger.info(f"시그널 {signum} 수신. 종료 중...")
        SHUTDOWN = True

def parse_args():
    """명령줄 인수를 파싱합니다."""
    parser = argparse.ArgumentParser(description="작업 스케줄링 스크립트")
    parser.add_argument("--daemon", action="store_true", 
                       help="데몬 모드로 실행합니다.")
    parser.add_argument("--logfile", type=str, default=None,
                       help="로그 파일 경로를 지정합니다.")
    parser.add_argument("--debug", action="store_true", 
                       help="디버그 로그를 활성화합니다.")
    return parser.parse_args()

def main():
    """스크립트 주 실행 함수"""
    args = parse_args()
    
    # 로그 레벨 설정
    log_level = logging.DEBUG if args.debug else logging.INFO
    logger.setLevel(log_level)
    
    # 로그 파일 설정
    if args.logfile:
        file_handler = logging.FileHandler(args.logfile)
        file_handler.setFormatter(logging.Formatter(settings.LOG_FORMAT))
        logger.addHandler(file_handler)
    
    # 시그널 핸들러 등록
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    logger.info("작업 스케줄러 시작")
    
    # 스케줄러 설정
    jobstores = {
        'default': SQLAlchemyJobStore(url=settings.DATABASE_URL)
    }
    
    executors = {
        'default': ThreadPoolExecutor(20),
        'processpool': ProcessPoolExecutor(5)
    }
    
    job_defaults = {
        'coalesce': False,
        'max_instances': 3,
        'misfire_grace_time': 60
    }
    
    scheduler = BackgroundScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone='UTC'
    )
    
    # 작업 스케줄링
    
    # 1. Git 작업 로그 정리 - 매일 새벽 3시에 실행
    scheduler.add_job(
        cleanup_git_logs,
        CronTrigger(hour=3, minute=0),
        id='cleanup_git_logs',
        replace_existing=True,
        name='Git 작업 로그 정리'
    )
    
    # 2. 데이터베이스 백업 - 매주 일요일 새벽 2시에 실행
    scheduler.add_job(
        database_backup,
        CronTrigger(day_of_week='sun', hour=2, minute=0),
        id='database_backup',
        replace_existing=True,
        name='데이터베이스 백업'
    )
    
    # 3. 세션 정리 - 매시간 실행
    scheduler.add_job(
        cleanup_sessions,
        CronTrigger(minute=30),
        id='cleanup_sessions',
        replace_existing=True,
        name='세션 정리'
    )
    
    # 스케줄러 시작
    scheduler.start()
    logger.info("작업 스케줄러가 시작되었습니다.")
    
    # 데몬 모드가 아니면 즉시 작업 실행 테스트
    if not args.daemon:
        logger.info("테스트 모드: Git 작업 로그 정리 작업을 즉시 실행합니다.")
        cleanup_git_logs()
        logger.info("테스트 완료. 스케줄러를 종료합니다.")
        scheduler.shutdown()
        return
    
    # 데몬 모드에서는 계속 실행
    try:
        while not SHUTDOWN:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        logger.info("작업 스케줄러 종료 중...")
        scheduler.shutdown()
        logger.info("작업 스케줄러가 종료되었습니다.")

if __name__ == "__main__":
    main() 