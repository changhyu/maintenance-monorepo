#!/usr/bin/env python
"""
Git 작업 로그 정리 스크립트

이 스크립트는 오래된 Git 작업 로그를 정리합니다.
- 성공적인 작업 로그는 일정 기간 후 삭제합니다.
- 실패한 작업 로그는 더 오래 보관합니다.
- 주요 작업(예: 푸시, 머지 등)의 로그는 따로 아카이브합니다.

사용법:
    python -m backend.scripts.cleanup_git_logs [--days 30] [--archive]
"""

import argparse
import datetime
import os
import sys
import logging
from pathlib import Path
from sqlalchemy import create_engine, text, and_, or_
from sqlalchemy.orm import sessionmaker
import csv
import json

# 상위 디렉토리를 파이썬 경로에 추가
parent_dir = str(Path(__file__).parent.parent.parent)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from backend.core.config import settings
from backend.models.git_operation_log import GitOperationLog, GitOperationType, GitOperationStatus
from backend.core.logger import get_logger

# 로거 설정
logger = get_logger("git_log_cleanup")

# 데이터베이스 연결
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)

def parse_args():
    """명령줄 인수를 파싱합니다."""
    parser = argparse.ArgumentParser(description="Git 작업 로그 정리 스크립트")
    parser.add_argument("--days", type=int, default=30, 
                       help="보관할 기간(일). 이 기간보다 오래된 로그는 삭제됩니다. 기본값: 30일")
    parser.add_argument("--archive", action="store_true", 
                       help="삭제된 로그를 CSV 파일로 아카이브합니다.")
    parser.add_argument("--dry-run", action="store_true", 
                       help="실제로 삭제하지 않고 삭제될 로그만 표시합니다.")
    parser.add_argument("--verbose", "-v", action="store_true", 
                       help="상세 로그를 출력합니다.")
    return parser.parse_args()

def archive_logs(logs, archive_dir):
    """삭제될 로그를 CSV 파일로 아카이브합니다."""
    # 아카이브 디렉토리 생성
    if not os.path.exists(archive_dir):
        os.makedirs(archive_dir)
    
    # 날짜를 파일 이름으로 사용
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_file = os.path.join(archive_dir, f"git_logs_archive_{timestamp}.csv")
    
    # CSV 파일로 로그 저장
    with open(archive_file, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = [
            'id', 'operation_type', 'status', 'user_id', 'repository_path',
            'branch_name', 'commit_hash', 'message', 'details',
            'error_message', 'created_at'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for log in logs:
            log_dict = {c.name: getattr(log, c.name) for c in log.__table__.columns}
            # datetime 객체를 문자열로 변환
            if log_dict['created_at'] is not None:
                log_dict['created_at'] = log_dict['created_at'].isoformat()
                
            # 긴 텍스트 필드 처리
            if log_dict['details'] and len(log_dict['details']) > 1000:
                log_dict['details'] = log_dict['details'][:997] + "..."
                
            if log_dict['error_message'] and len(log_dict['error_message']) > 1000:
                log_dict['error_message'] = log_dict['error_message'][:997] + "..."
                
            writer.writerow(log_dict)
    
    logger.info(f"{len(logs)}개의 로그가 {archive_file}에 아카이브되었습니다.")
    return archive_file

def cleanup_logs(days=30, archive=False, dry_run=False, verbose=False):
    """
    오래된 Git 작업 로그를 정리합니다.
    
    Args:
        days: 보관할 기간(일)
        archive: 삭제된 로그를 아카이브할지 여부
        dry_run: 실제로 삭제하지 않고 삭제될 로그만 표시
        verbose: 상세 로그 출력 여부
    """
    session = Session()
    try:
        # 기준 날짜 계산
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
        
        # 중요 작업 유형 정의
        important_operations = [
            GitOperationType.PUSH,
            GitOperationType.MERGE,
            GitOperationType.TAG,
            GitOperationType.BRANCH_CREATE
        ]
        
        # 오래된 로그 중 삭제 대상 찾기
        # 1. 성공한 일반 작업: 모든 작업 중 중요 작업이 아니고 성공한 작업
        success_logs_query = session.query(GitOperationLog).filter(
            and_(
                GitOperationLog.created_at < cutoff_date,
                GitOperationLog.status == GitOperationStatus.SUCCESS,
                GitOperationLog.operation_type.not_in(important_operations)
            )
        )
        
        # 2. 실패한 작업: 더 오래된 기간 적용 (3배)
        failure_cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days*3)
        failure_logs_query = session.query(GitOperationLog).filter(
            and_(
                GitOperationLog.created_at < failure_cutoff_date,
                GitOperationLog.status == GitOperationStatus.FAILURE
            )
        )
        
        # 3. 중요 작업: 더 오래된 기간 적용 (6배)
        important_cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days*6)
        important_logs_query = session.query(GitOperationLog).filter(
            and_(
                GitOperationLog.created_at < important_cutoff_date,
                GitOperationLog.operation_type.in_(important_operations)
            )
        )
        
        # 모든 삭제 대상 로그 조회
        success_logs = success_logs_query.all()
        failure_logs = failure_logs_query.all()
        important_logs = important_logs_query.all()
        
        # 로그 정보 출력
        if verbose or dry_run:
            logger.info(f"삭제 대상 로그 개수:")
            logger.info(f"- 일반 성공 로그 ({days}일 이전): {len(success_logs)}개")
            logger.info(f"- 실패 로그 ({days*3}일 이전): {len(failure_logs)}개")
            logger.info(f"- 중요 작업 로그 ({days*6}일 이전): {len(important_logs)}개")
        
        # 모든 삭제 대상 로그 합치기
        logs_to_delete = success_logs + failure_logs + important_logs
        
        # 로그가 없으면 종료
        if not logs_to_delete:
            logger.info("삭제할 로그가 없습니다.")
            return
            
        # 아카이브
        if archive:
            archive_dir = os.path.join(settings.LOG_DIR, "git_logs_archive")
            archive_file = archive_logs(logs_to_delete, archive_dir)
            
        # Dry run 모드이면 실제 삭제하지 않음
        if dry_run:
            logger.info(f"Dry run 모드: {len(logs_to_delete)}개의 로그가 삭제 대상입니다.")
            return
            
        # 로그 삭제
        for logs in [success_logs, failure_logs, important_logs]:
            if logs:
                log_ids = [log.id for log in logs]
                session.query(GitOperationLog).filter(GitOperationLog.id.in_(log_ids)).delete(synchronize_session=False)
        
        # 변경사항 저장
        session.commit()
        logger.info(f"{len(logs_to_delete)}개의 오래된 Git 작업 로그가 정리되었습니다.")
    
    except Exception as e:
        session.rollback()
        logger.error(f"로그 정리 중 오류 발생: {str(e)}", exc_info=True)
    finally:
        session.close()

def main():
    """스크립트 주 실행 함수"""
    args = parse_args()
    
    # 로깅 레벨 설정
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info(f"Git 작업 로그 정리 시작 (보관 기간: {args.days}일)")
    
    cleanup_logs(
        days=args.days,
        archive=args.archive,
        dry_run=args.dry_run,
        verbose=args.verbose
    )
    
    logger.info("Git 작업 로그 정리 완료")

if __name__ == "__main__":
    main() 