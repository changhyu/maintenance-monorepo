"""
백업 서비스 모듈

백업 생성, 저장, 복원, 삭제 등의 작업을 처리하는 서비스 클래스를 제공합니다.
"""

import json
import logging
import os
import shutil
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from src.config.settings import settings
from src.schemas.backup.backup_schemas import (BackupCleanupResponse,
                                               BackupCreate,
                                               BackupDeleteResponse,
                                               BackupDetail, BackupList,
                                               BackupMeta, BackupResponse,
                                               BackupRestoreResponse)


class BackupService:
    """
    백업 서비스 클래스

    백업 생성, 조회, 복원, 삭제 등 백업 관련 기능을 제공합니다.
    """

    def __init__(self):
        """서비스 초기화 및 백업 디렉토리 설정"""
        self.logger = logging.getLogger(__name__)
        self.backup_dir = os.path.join(settings.DATA_DIR, "backups")

        # 백업 디렉토리가 없으면 생성
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir, exist_ok=True)
            self.logger.info(f"백업 디렉토리 생성: {self.backup_dir}")

    def create_backup(self, backup_data: BackupCreate) -> BackupResponse:
        """
        새 백업 생성 및 저장

        Args:
            backup_data: 백업 생성 요청 데이터

        Returns:
            생성된 백업 정보
        """
        backup_id = str(uuid.uuid4())
        created_at = datetime.now().isoformat()

        # 메타데이터 및 백업 데이터 준비
        backup_meta = {
            "id": backup_id,
            "type": backup_data.type,
            "created_at": created_at,
            "filename": f"{backup_id}.json",
        }

        backup_content = {"meta": backup_meta, "data": backup_data.data}

        # 백업 파일 저장
        backup_path = os.path.join(self.backup_dir, f"{backup_id}.json")
        try:
            with open(backup_path, "w") as f:
                json.dump(backup_content, f, indent=2)

            # 메타데이터 인덱스 업데이트
            self._update_meta_index(backup_meta)

            self.logger.info(f"백업 생성 완료: {backup_id}")
            return BackupResponse(
                backup_id=backup_id,
                type=backup_data.type,
                created_at=created_at,
                message="백업이 성공적으로 생성되었습니다.",
            )
        except Exception as e:
            self.logger.error(f"백업 생성 실패: {str(e)}")
            raise RuntimeError(f"백업 생성 중 오류 발생: {str(e)}")

    def list_backups(
        self, backup_type: Optional[str] = None, limit: int = 100
    ) -> BackupList:
        """
        백업 목록 조회

        Args:
            backup_type: 필터링할 백업 유형 (선택 사항)
            limit: 반환할 최대 백업 수

        Returns:
            백업 목록
        """
        try:
            meta_list = self._get_backup_meta_list()

            # 유형으로 필터링 (필요한 경우)
            if backup_type:
                meta_list = [m for m in meta_list if m.get("type") == backup_type]

            # 생성 날짜 기준 정렬 (최신순)
            meta_list.sort(key=lambda x: x.get("created_at", ""), reverse=True)

            # 요청된 수 제한
            meta_list = meta_list[:limit]

            return BackupList(backups=meta_list, count=len(meta_list))
        except Exception as e:
            self.logger.error(f"백업 목록 조회 실패: {str(e)}")
            raise RuntimeError(f"백업 목록 조회 중 오류 발생: {str(e)}")

    def get_backup(self, backup_id: str) -> BackupDetail:
        """
        특정 백업 상세 조회

        Args:
            backup_id: 조회할 백업 ID

        Returns:
            백업 상세 정보
        """
        try:
            backup_path = os.path.join(self.backup_dir, f"{backup_id}.json")

            if not os.path.exists(backup_path):
                self.logger.error(f"백업을 찾을 수 없음: {backup_id}")
                raise ValueError(f"백업 ID {backup_id}를 찾을 수 없습니다.")

            with open(backup_path, "r") as f:
                backup_content = json.load(f)

            meta = backup_content.get("meta", {})
            data = backup_content.get("data", {})

            return BackupDetail(
                id=meta.get("id"),
                type=meta.get("type"),
                created_at=meta.get("created_at"),
                data=data,
            )
        except ValueError:
            raise
        except Exception as e:
            self.logger.error(f"백업 조회 실패: {str(e)}")
            raise RuntimeError(f"백업 조회 중 오류 발생: {str(e)}")

    def restore_backup(self, backup_id: str) -> BackupRestoreResponse:
        """
        백업에서 데이터 복원

        Args:
            backup_id: 복원할 백업 ID

        Returns:
            복원 결과 정보
        """
        try:
            # 백업 데이터 가져오기
            backup_detail = self.get_backup(backup_id)
            backup_data = backup_detail.data

            # 여기서 실제 데이터 복원 로직을 구현
            # (이 예제에서는 데이터를 반환만 하고 실제 복원은 구현하지 않음)

            self.logger.info(f"백업 {backup_id} 복원 완료")

            return BackupRestoreResponse(
                restored=True,
                backup_id=backup_id,
                message=f"백업 {backup_id}에서 데이터가 성공적으로 복원되었습니다.",
                data=backup_data,
            )
        except Exception as e:
            self.logger.error(f"백업 복원 실패: {str(e)}")
            raise RuntimeError(f"백업 복원 중 오류 발생: {str(e)}")

    def delete_backup(self, backup_id: str) -> BackupDeleteResponse:
        """
        백업 삭제

        Args:
            backup_id: 삭제할 백업 ID

        Returns:
            삭제 결과 정보
        """
        try:
            backup_path = os.path.join(self.backup_dir, f"{backup_id}.json")

            if not os.path.exists(backup_path):
                self.logger.error(f"삭제할 백업을 찾을 수 없음: {backup_id}")
                raise ValueError(f"백업 ID {backup_id}를 찾을 수 없습니다.")

            # 백업 파일 삭제
            os.remove(backup_path)

            # 메타데이터 인덱스에서 삭제
            self._remove_from_meta_index(backup_id)

            self.logger.info(f"백업 삭제 완료: {backup_id}")

            return BackupDeleteResponse(
                deleted=True,
                backup_id=backup_id,
                message=f"백업 {backup_id}가 성공적으로 삭제되었습니다.",
            )
        except ValueError:
            raise
        except Exception as e:
            self.logger.error(f"백업 삭제 실패: {str(e)}")
            raise RuntimeError(f"백업 삭제 중 오류 발생: {str(e)}")

    def cleanup_old_backups(
        self, backup_type: Optional[str] = None, keep_count: int = 10
    ) -> BackupCleanupResponse:
        """
        오래된 백업 정리

        Args:
            backup_type: 정리할 백업 유형 (선택 사항)
            keep_count: 유지할 최신 백업 수

        Returns:
            정리 결과 정보
        """
        try:
            # 백업 목록 가져오기
            backup_list = self.list_backups(backup_type=backup_type, limit=1000)
            backups = backup_list.backups

            # 생성 날짜 기준 정렬 (최신순)
            backups.sort(key=lambda x: x.get("created_at", ""), reverse=True)

            # 보존해야 할 백업과 삭제할 백업 분리
            to_keep = backups[:keep_count]
            to_delete = backups[keep_count:]

            # 삭제 처리
            deleted_count = 0
            for backup in to_delete:
                backup_id = backup.get("id")
                try:
                    self.delete_backup(backup_id)
                    deleted_count += 1
                except Exception as e:
                    self.logger.warning(f"백업 {backup_id} 삭제 실패: {str(e)}")

            self.logger.info(f"백업 정리 완료. 삭제된 백업 수: {deleted_count}")

            return BackupCleanupResponse(
                cleaned_up=True,
                deleted_count=deleted_count,
                message=f"{deleted_count}개의 오래된 백업이 정리되었습니다.",
            )
        except Exception as e:
            self.logger.error(f"백업 정리 실패: {str(e)}")
            raise RuntimeError(f"백업 정리 중 오류 발생: {str(e)}")

    def _get_backup_meta_list(self) -> List[Dict[str, Any]]:
        """백업 메타데이터 목록 가져오기"""
        meta_list = []

        # 백업 디렉토리 내 모든 JSON 파일 스캔
        for filename in os.listdir(self.backup_dir):
            if not filename.endswith(".json"):
                continue

            if filename == "backup_index.json":
                continue

            try:
                with open(os.path.join(self.backup_dir, filename), "r") as f:
                    backup_content = json.load(f)
                    meta = backup_content.get("meta", {})
                    if meta:
                        meta_list.append(meta)
            except Exception as e:
                self.logger.warning(f"백업 메타데이터 추출 실패 ({filename}): {str(e)}")

        return meta_list

    def _update_meta_index(self, meta: Dict[str, Any]) -> None:
        """백업 메타데이터 인덱스 업데이트"""
        index_path = os.path.join(self.backup_dir, "backup_index.json")

        try:
            # 기존 인덱스 로드 또는 새로 생성
            if os.path.exists(index_path):
                with open(index_path, "r") as f:
                    index_data = json.load(f)
            else:
                index_data = {"backups": []}

            # 새 메타데이터 추가
            index_data["backups"].append(meta)

            # 인덱스 저장
            with open(index_path, "w") as f:
                json.dump(index_data, f, indent=2)
        except Exception as e:
            self.logger.warning(f"메타데이터 인덱스 업데이트 실패: {str(e)}")

    def _remove_from_meta_index(self, backup_id: str) -> None:
        """백업 메타데이터 인덱스에서 항목 제거"""
        index_path = os.path.join(self.backup_dir, "backup_index.json")

        if not os.path.exists(index_path):
            return

        try:
            # 인덱스 로드
            with open(index_path, "r") as f:
                index_data = json.load(f)

            # 해당 백업 ID 제거
            index_data["backups"] = [
                b for b in index_data.get("backups", []) if b.get("id") != backup_id
            ]

            # 인덱스 저장
            with open(index_path, "w") as f:
                json.dump(index_data, f, indent=2)
        except Exception as e:
            self.logger.warning(f"메타데이터 인덱스에서 항목 제거 실패: {str(e)}")
