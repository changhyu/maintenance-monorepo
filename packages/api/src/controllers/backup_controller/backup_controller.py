"""
백업 컨트롤러 모듈

백업 관련 API 요청을 처리하는 컨트롤러 클래스를 제공합니다.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from packagesmodules.backup_service import BackupService
from packagesschemas.backup import (
    BackupCreate,
    BackupDetail,
    BackupList,
    BackupResponse,
    BackupRestoreResponse,
)

logger = logging.getLogger(__name__)


class BackupController:
    """
    백업 API 요청을 처리하는 컨트롤러

    백업 생성, 조회, 복원, 삭제 등의 작업을 처리합니다.
    """

    def __init__(self, backup_service: Optional[BackupService] = None):
        """
        백업 컨트롤러 초기화

        Args:
            backup_service: 사용할 백업 서비스 인스턴스 (None인 경우 기본 인스턴스 생성)
        """
        self.backup_service = backup_service or BackupService()
        self.logger = logger
        self.logger.info(f"백업 컨트롤러 초기화: 경로={__file__}")

    async def create_backup(
        self, data: Dict[str, Any], backup_type: str
    ) -> BackupResponse:
        """
        지정된 유형의 데이터 백업을 생성합니다.

        Args:
            data: 백업할 데이터
            backup_type: 백업 유형 (예: 'maintenance', 'vehicle' 등)

        Returns:
            생성된 백업의 정보
        """
        try:
            self.logger.info(f"{backup_type} 백업 생성 요청 처리 중")

            # 백업 생성
            backup_id = await self.backup_service.create_backup(data, backup_type)

            # 생성된 백업의 메타데이터 조회
            backups = await self.backup_service.list_backups(
                backup_type=backup_type, limit=1
            )
            if not backups:
                self.logger.error(
                    f"백업 생성 후 메타데이터를 찾을 수 없음: {backup_id}"
                )
                raise ValueError("백업 생성 후 메타데이터를 찾을 수 없습니다.")

            metadata = backups[0]

            self.logger.info(f"백업 생성 완료: {backup_id}")

            # 응답 데이터 구성
            return BackupResponse(
                backup_id=backup_id,
                type=backup_type,
                created_at=metadata["created_at"],
                message=f"{backup_type} 데이터의 백업이 성공적으로 생성되었습니다.",
            )
        except Exception as e:
            self.logger.error(f"백업 생성 중 오류 발생: {str(e)}")
            raise

    async def list_backups(
        self, backup_type: Optional[str] = None, limit: int = 10
    ) -> BackupList:
        """
        백업 목록을 조회합니다.

        Args:
            backup_type: 필터링할 백업 유형 (None인 경우 모든 유형)
            limit: 반환할 최대 항목 수

        Returns:
            백업 목록 정보
        """
        try:
            self.logger.info(
                f"백업 목록 조회: 유형={backup_type or '전체'}, 최대={limit}개"
            )

            backups = await self.backup_service.list_backups(
                backup_type=backup_type, limit=limit
            )

            self.logger.info(f"백업 목록 조회 완료: {len(backups)}개 항목")

            return BackupList(backups=backups, count=len(backups))
        except Exception as e:
            self.logger.error(f"백업 목록 조회 중 오류 발생: {str(e)}")
            raise

    async def get_backup(self, backup_id: str) -> BackupDetail:
        """
        특정 백업의 상세 정보와 데이터를 조회합니다.

        Args:
            backup_id: 조회할 백업 ID

        Returns:
            백업 상세 정보
        """
        try:
            self.logger.info(f"백업 상세 조회: {backup_id}")

            # 백업 메타데이터 찾기
            backups = await self.backup_service.list_backups(limit=100)
            metadata = None

            for backup in backups:
                if backup["id"] == backup_id:
                    metadata = backup
                    break

            if not metadata:
                self.logger.warning(f"백업을 찾을 수 없음: {backup_id}")
                raise ValueError(f"백업을 찾을 수 없음: {backup_id}")

            # 백업 데이터 복원
            data = await self.backup_service.restore_from_backup(backup_id)

            self.logger.info(f"백업 상세 조회 완료: {backup_id}")

            return BackupDetail(
                id=backup_id,
                type=metadata["type"],
                created_at=metadata["created_at"],
                data=data,
            )
        except Exception as e:
            self.logger.error(f"백업 상세 조회 중 오류 발생: {str(e)}")
            raise

    async def restore_backup(self, backup_id: str) -> BackupRestoreResponse:
        """
        백업에서 데이터를 복원합니다.

        Args:
            backup_id: 복원할 백업 ID

        Returns:
            복원 결과 정보
        """
        try:
            self.logger.info(f"백업 복원 요청: {backup_id}")

            data = await self.backup_service.restore_from_backup(backup_id)

            self.logger.info(f"백업 복원 완료: {backup_id}")

            return BackupRestoreResponse(
                restored=True,
                backup_id=backup_id,
                message="백업에서 데이터가 성공적으로 복원되었습니다.",
                data=data,
            )
        except Exception as e:
            self.logger.error(f"백업 복원 중 오류 발생: {str(e)}")
            raise

    async def delete_backup(self, backup_id: str) -> Dict[str, Any]:
        """
        백업을 삭제합니다.

        Args:
            backup_id: 삭제할 백업 ID

        Returns:
            삭제 결과 정보
        """
        try:
            self.logger.info(f"백업 삭제 요청: {backup_id}")

            success = await self.backup_service.delete_backup(backup_id)

            if not success:
                self.logger.warning(f"삭제할 백업을 찾을 수 없음: {backup_id}")
                raise ValueError(f"백업을 찾을 수 없음: {backup_id}")

            self.logger.info(f"백업 삭제 완료: {backup_id}")

            return {
                "deleted": True,
                "backup_id": backup_id,
                "message": "백업이 성공적으로 삭제되었습니다.",
            }
        except Exception as e:
            self.logger.error(f"백업 삭제 중 오류 발생: {str(e)}")
            raise

    async def cleanup_old_backups(self) -> Dict[str, Any]:
        """
        오래된 백업을 정리합니다.

        Returns:
            정리 결과 정보
        """
        try:
            self.logger.info("오래된 백업 정리 요청")

            deleted_count = await self.backup_service.cleanup_old_backups()

            self.logger.info(f"오래된 백업 정리 완료: {deleted_count}개 삭제됨")

            return {
                "cleaned_up": True,
                "deleted_count": deleted_count,
                "message": f"{deleted_count}개의 오래된 백업이 정리되었습니다.",
            }
        except Exception as e:
            self.logger.error(f"백업 정리 중 오류 발생: {str(e)}")
            raise
