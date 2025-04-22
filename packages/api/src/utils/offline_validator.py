"""
오프라인 데이터 검증 유틸리티.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

from packagescore.logging import get_logger
from packagescore.offline_manager import offline_manager

logger = get_logger("offline_validator")


def validate_all_offline_data() -> Dict[str, Any]:
    """
    모든 오프라인 데이터를 검증합니다.

    Returns:
        Dict[str, Any]: 검증 결과 요약
    """
    logger.info("오프라인 데이터 검증 시작...")

    try:
        result = offline_manager.validate_offline_cache()

        if result["status"] == "success":
            logger.info(
                f"모든 오프라인 데이터 검증 완료: {result['valid']}개 정상, {result.get('repaired', 0)}개 복구됨"
            )
        else:
            logger.warning(
                f"일부 오프라인 데이터 검증 실패: {result.get('failed', 0)}개 실패"
            )

        return result
    except Exception as e:
        logger.error(f"오프라인 데이터 검증 중 오류 발생: {str(e)}")
        return {"status": "error", "message": str(e)}


def clean_orphaned_pending_operations() -> Dict[str, Any]:
    """
    고아 상태의 대기 중인 작업을 정리합니다.
    (엔티티가 없는데 대기 중인 작업만 남아있는 경우)

    Returns:
        Dict[str, Any]: 정리 결과 요약
    """
    logger.info("고아 상태의 대기 중인 작업 정리 시작...")

    try:
        storage_dir = offline_manager.storage_dir
        entity_files = set()
        pending_files = set()

        # 파일 목록 조회
        for filename in os.listdir(storage_dir):
            if filename.endswith(".json"):
                if filename.endswith("_pending.json"):
                    # 엔티티 타입 추출
                    entity_type = filename[:-13]  # '_pending.json' 제거
                    pending_files.add(entity_type)
                elif filename != "offline_status.json":
                    # 일반 엔티티 파일
                    entity_type = filename[:-5]  # '.json' 제거
                    entity_files.add(entity_type)

        # 고아 상태 확인
        orphaned = pending_files - entity_files

        if not orphaned:
            logger.info("고아 상태의 대기 중인 작업이 없습니다.")
            return {
                "status": "success",
                "message": "No orphaned pending operations found",
            }

        # 고아 상태의 파일 정리
        cleaned = []
        for entity_type in orphaned:
            pending_file = os.path.join(storage_dir, f"{entity_type}_pending.json")

            # 백업 생성
            if os.path.exists(pending_file):
                backup_file = f"{pending_file}.bak"
                with open(pending_file, "r") as f_in:
                    with open(backup_file, "w") as f_out:
                        f_out.write(f_in.read())

                # 파일 제거
                os.remove(pending_file)
                cleaned.append(entity_type)
                logger.info(
                    f"고아 상태의 작업 파일 제거: {entity_type} (백업: {backup_file})"
                )

        return {"status": "success", "cleaned": cleaned, "count": len(cleaned)}
    except Exception as e:
        logger.error(f"고아 상태의 대기 중인 작업 정리 중 오류 발생: {str(e)}")
        return {"status": "error", "message": str(e)}


def get_offline_storage_info() -> Dict[str, Any]:
    """
    오프라인 저장소 정보를 반환합니다.

    Returns:
        Dict[str, Any]: 저장소 정보
    """
    try:
        storage_dir = offline_manager.storage_dir

        if not os.path.exists(storage_dir):
            return {
                "status": "not_found",
                "message": f"오프라인 저장소 디렉토리가 존재하지 않습니다: {storage_dir}",
            }

        # 파일 목록 및 크기 조회
        files = []
        total_size = 0

        for filename in os.listdir(storage_dir):
            if filename.endswith(".json"):
                file_path = os.path.join(storage_dir, filename)
                size = os.path.getsize(file_path)
                total_size += size

                item = {
                    "name": filename,
                    "size": size,
                    "last_modified": os.path.getmtime(file_path),
                }

                # 엔티티 수 확인
                if not (
                    filename.endswith("_pending.json")
                    or filename == "offline_status.json"
                ):
                    try:
                        with open(file_path, "r") as f:
                            data = json.load(f)
                            item["entities"] = (
                                len(data) if isinstance(data, list) else 0
                            )
                    except:
                        item["entities"] = "error"

                files.append(item)

        return {
            "status": "success",
            "storage_dir": storage_dir,
            "files": files,
            "total_size": total_size,
            "file_count": len(files),
        }
    except Exception as e:
        logger.error(f"오프라인 저장소 정보 조회 중 오류 발생: {str(e)}")
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    # 스크립트로 직접 실행 시 테스트
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "validate":
            print(json.dumps(validate_all_offline_data(), indent=2))
        elif command == "clean":
            print(json.dumps(clean_orphaned_pending_operations(), indent=2))
        elif command == "info":
            print(json.dumps(get_offline_storage_info(), indent=2))
        else:
            print(f"Unknown command: {command}")
            print("Usage: python -m src.utils.offline_validator [validate|clean|info]")
    else:
        # 기본 명령: 모든 검증 실행
        validate_result = validate_all_offline_data()
        print("Validation result:")
        print(json.dumps(validate_result, indent=2))

        clean_result = clean_orphaned_pending_operations()
        print("\nCleanup result:")
        print(json.dumps(clean_result, indent=2))

        info_result = get_offline_storage_info()
        print("\nStorage info:")
        print(json.dumps(info_result, indent=2))
