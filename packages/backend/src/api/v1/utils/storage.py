import os
import uuid
from fastapi import UploadFile
import aiofiles
from typing import Optional

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

async def upload_file_to_storage(file: UploadFile, path: str) -> str:
    """
    파일을 스토리지에 업로드합니다.
    
    Args:
        file: 업로드할 파일
        path: 저장할 경로
        
    Returns:
        업로드된 파일의 URL
    """
    # 업로드 디렉토리 생성
    full_path = os.path.join(UPLOAD_DIR, path)
    os.makedirs(full_path, exist_ok=True)

    # 파일 확장자 추출
    file_ext = os.path.splitext(file.filename)[1]
    
    # 고유한 파일명 생성
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(full_path, filename)

    # 파일 저장
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)

    # 파일 URL 반환
    return f"/uploads/{path}/{filename}"

async def delete_file_from_storage(file_url: str) -> bool:
    """
    스토리지에서 파일을 삭제합니다.
    
    Args:
        file_url: 삭제할 파일의 URL
        
    Returns:
        삭제 성공 여부
    """
    try:
        # URL에서 파일 경로 추출
        file_path = file_url.replace("/uploads/", "", 1)
        full_path = os.path.join(UPLOAD_DIR, file_path)

        # 파일 삭제
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False
    except Exception:
        return False 