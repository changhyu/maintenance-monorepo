from fastapi import APIRouter, HTTPException, status, Query, Path as FastAPIPath, Depends
from typing import Dict, Any, List, Optional, Union
import os
import glob
import datetime
import logging
import re
from pathlib import Path as FilePath

router = APIRouter(prefix="/logs", tags=["로그"])

# 로그 디렉토리 설정
LOG_DIR = os.environ.get("LOG_DIR", "logs")

# 로그 파일 경로 확인 함수
def get_log_path(filename: str = None) -> str:
    """
    로그 파일의 절대 경로를 반환합니다.
    """
    if not os.path.exists(LOG_DIR):
        try:
            os.makedirs(LOG_DIR, exist_ok=True)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"로그 디렉토리를 생성할 수 없습니다: {str(e)}"
            )
    
    if filename:
        return os.path.join(LOG_DIR, filename)
    return LOG_DIR

@router.get("/files")
async def list_log_files():
    """
    사용 가능한 로그 파일 목록을 반환합니다.
    """
    log_dir = get_log_path()
    
    # 로그 파일 검색
    log_files = []
    for ext in ["log", "txt"]:
        log_files.extend(glob.glob(f"{log_dir}/*.{ext}"))
    
    # 파일 정보 수집
    result = []
    for file_path in log_files:
        try:
            filename = os.path.basename(file_path)
            stats = os.stat(file_path)
            result.append({
                "filename": filename,
                "size": stats.st_size,
                "modified": datetime.datetime.fromtimestamp(stats.st_mtime).isoformat(),
                "created": datetime.datetime.fromtimestamp(stats.st_ctime).isoformat()
            })
        except Exception as e:
            continue
    
    # 수정 시간 기준으로 정렬
    result.sort(key=lambda x: x["modified"], reverse=True)
    
    return {"log_files": result}

@router.get("/content/{filename}")
async def get_log_content(
    filename: str = FastAPIPath(..., description="로그 파일 이름"),
    lines: int = Query(100, description="읽을 라인 수", ge=1, le=1000),
    filter: Optional[str] = Query(None, description="로그 필터링 키워드"),
    level: Optional[str] = Query(None, description="로그 레벨 필터 (INFO, ERROR, WARNING, DEBUG)")
):
    """
    특정 로그 파일의 내용을 반환합니다.
    """
    # 보안 검사 - 경로 주입 방지
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않은 파일 이름입니다."
        )
    
    log_path = get_log_path(filename)
    
    try:
        if not os.path.exists(log_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"로그 파일을 찾을 수 없습니다: {filename}"
            )
        
        # 로그 파일 읽기 및 필터링
        log_content = []
        with open(log_path, "r", encoding="utf-8", errors="ignore") as file:
            all_lines = file.readlines()
            # 마지막 N 라인 가져오기
            filtered_lines = all_lines[-lines:] if lines < len(all_lines) else all_lines
            
            # 필터링 적용
            if filter or level:
                temp_lines = []
                for line in filtered_lines:
                    if filter and filter.lower() not in line.lower():
                        continue
                    
                    if level:
                        level_pattern = r"\b" + level.upper() + r"\b"
                        if not re.search(level_pattern, line):
                            continue
                    
                    temp_lines.append(line)
                filtered_lines = temp_lines
            
            log_content = [line.rstrip() for line in filtered_lines]
        
        return {
            "filename": filename,
            "total_lines": len(all_lines),
            "returned_lines": len(log_content),
            "content": log_content
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"로그 파일을 읽는 동안 오류가 발생했습니다: {str(e)}"
        )

@router.post("/write")
async def write_log(
    message: str,
    level: str = Query("INFO", description="로그 레벨 (INFO, ERROR, WARNING, DEBUG)"),
    logger_name: str = Query("api", description="로거 이름")
):
    """
    새 로그 메시지를 작성합니다.
    """
    valid_levels = ["INFO", "ERROR", "WARNING", "DEBUG", "CRITICAL"]
    if level.upper() not in valid_levels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 로그 레벨입니다. 유효한 값: {', '.join(valid_levels)}"
        )
    
    try:
        # 로거 구성
        log_file = get_log_path(f"{logger_name}.log")
        logger = logging.getLogger(logger_name)
        
        # 핸들러가 없으면 추가
        if not logger.handlers:
            file_handler = logging.FileHandler(log_file)
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
            logger.setLevel(logging.DEBUG)
        
        # 로그 레벨에 따라 메시지 기록
        log_level = getattr(logging, level.upper())
        logger.log(log_level, message)
        
        return {"success": True, "message": "로그 메시지가 기록되었습니다."}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"로그 작성 중 오류가 발생했습니다: {str(e)}"
        ) 