"""
지능형 문서 관리 시스템 메인 엔트리포인트
OCR 및 문서 분류 기능 제공
"""

import os
import sys
import tempfile
from typing import Any, Dict, List, Optional

import uvicorn

# 현재 디렉토리를 시스템 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 내부 모듈 임포트
from fastapi import (BackgroundTasks, Depends, File, Form, HTTPException,
                     UploadFile)
from maintenance_shared_python.config import BaseAppSettings
# 공유 패키지 임포트
from maintenance_shared_python.fastapi_app import create_fastapi_app
from maintenance_shared_python.logging import get_logger, setup_logging
from pydantic import BaseModel
# 모듈 임포트
from src.classification.document_classifier import DocumentClassifier
from src.database.document_repository import DocumentRepository
from src.database.models import DocumentMetadata
from src.ocr.ocr_engine import OCREngine
from src.utils.file_handler import FileHandler


# 설정 클래스 생성
class DocumentServiceSettings(BaseAppSettings):
    PROJECT_NAME: str = "지능형 문서 관리 API"
    PORT: int = 8004


# 로깅 및 설정
logger = setup_logging("document_service")
logger.info("문서 관리 서비스 초기화 시작")
settings = DocumentServiceSettings()

# 서비스 컴포넌트 초기화
ocr_engine = OCREngine()
document_classifier = DocumentClassifier()
file_handler = FileHandler()
document_repository = DocumentRepository()


# 데이터 모델
class OCRRequest(BaseModel):
    document_id: Optional[str] = None
    language: Optional[str] = "kor+eng"
    extract_tables: bool = False
    enhance_image: bool = True


class DocumentClassificationRequest(BaseModel):
    document_id: str
    categories: Optional[List[str]] = None


class DocumentMetadataResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
    upload_date: str
    classification: Optional[Dict[str, float]] = None
    tags: Optional[List[str]] = None
    text_content: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None


# 시작/종료 함수 정의
async def startup_event():
    """서비스 시작 시 초기화 작업"""
    logger.info("문서 관리 서비스 시작")
    try:
        await document_repository.initialize()
        logger.info("문서 저장소 초기화 완료")
    except Exception as e:
        logger.error(f"문서 저장소 초기화 중 오류 발생: {str(e)}")


async def shutdown_event():
    """서비스 종료 시 리소스 정리"""
    logger.info("문서 관리 서비스 종료 중...")
    try:
        await document_repository.close()
        logger.info("문서 저장소 연결 종료")
    except Exception as e:
        logger.error(f"문서 저장소 연결 종료 중 오류 발생: {str(e)}")


# FastAPI 애플리케이션 생성 및 설정 (공통 모듈 사용)
app = create_fastapi_app(
    settings=settings,
    title="지능형 문서 관리 API",
    description="OCR 및 문서 분류 기능을 제공하는 API",
    version="0.1.0",
    on_startup=[startup_event],
    on_shutdown=[shutdown_event],
    logger=logger,
)


# API 엔드포인트
@app.post("/ocr", response_model=Dict[str, Any])
async def extract_text(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    options: OCRRequest = Depends(),
):
    """
    문서에서 텍스트 추출 (OCR)
    """
    try:
        # 파일 임시 저장
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=os.path.splitext(file.filename)[1]
        ) as temp_file:
            contents = await file.read()
            temp_file.write(contents)
            temp_path = temp_file.name

        # OCR 처리
        result = await ocr_engine.process_document(
            file_path=temp_path,
            language=options.language,
            extract_tables=options.extract_tables,
            enhance_image=options.enhance_image,
        )

        # 파일 정보 및 결과 데이터베이스 저장
        document_id = options.document_id or await file_handler.generate_document_id()
        metadata = DocumentMetadata(
            id=document_id,
            filename=file.filename,
            content_type=file.content_type,
            size=len(contents),
            text_content=result.get("text", ""),
            extracted_data=result,
        )

        # 비동기로 파일 및 메타데이터 저장
        background_tasks.add_task(document_repository.save_document, metadata, contents)

        # 결과 반환
        return {
            "document_id": document_id,
            "filename": file.filename,
            "text": result.get("text", ""),
            "confidence": result.get("confidence"),
            "tables": result.get("tables", []),
            "language": options.language,
            "processing_time": result.get("processing_time"),
        }
    except Exception as e:
        logger.error(f"OCR 처리 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OCR 처리 실패: {str(e)}")
    finally:
        # 임시 파일 삭제
        if "temp_path" in locals():
            os.unlink(temp_path)


@app.post("/classify", response_model=Dict[str, Any])
async def classify_document(
    request: DocumentClassificationRequest, background_tasks: BackgroundTasks
):
    """
    문서 유형 분류
    """
    try:
        # 문서 로드
        document = await document_repository.get_document_by_id(request.document_id)
        if not document:
            raise HTTPException(
                status_code=404, detail=f"문서를 찾을 수 없음: {request.document_id}"
            )

        # 문서 분류
        classification = await document_classifier.classify_document(
            text=document.text_content, categories=request.categories
        )

        # 메타데이터 업데이트
        tags = [c[0] for c in classification[:3]]  # 상위 3개 카테고리를 태그로 사용
        background_tasks.add_task(
            document_repository.update_document_classification,
            request.document_id,
            classification_result=dict(classification),
            tags=tags,
        )

        # 결과 반환
        return {
            "document_id": request.document_id,
            "classification": dict(classification),
            "suggested_tags": tags,
            "processing_time": classification.get("processing_time"),
        }
    except Exception as e:
        logger.error(f"문서 분류 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문서 분류 실패: {str(e)}")


@app.get("/documents/{document_id}", response_model=DocumentMetadataResponse)
async def get_document(document_id: str):
    """
    문서 메타데이터 조회
    """
    try:
        document = await document_repository.get_document_by_id(document_id)
        if not document:
            raise HTTPException(
                status_code=404, detail=f"문서를 찾을 수 없음: {document_id}"
            )
        return document
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"문서 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문서 조회 실패: {str(e)}")


@app.get("/documents", response_model=List[DocumentMetadataResponse])
async def get_documents(
    tag: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """
    문서 목록 조회 (태그 또는 카테고리별 필터링 가능)
    """
    try:
        documents = await document_repository.get_documents(
            tag=tag, category=category, limit=limit, offset=offset
        )
        return documents
    except Exception as e:
        logger.error(f"문서 목록 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문서 목록 조회 실패: {str(e)}")


@app.post("/extract_fields", response_model=Dict[str, Any])
async def extract_fields(
    document_id: str = Form(...), template_id: Optional[str] = Form(None)
):
    """
    템플릿 기반 필드 추출
    """
    try:
        document = await document_repository.get_document_by_id(document_id)
        if not document:
            raise HTTPException(
                status_code=404, detail=f"문서를 찾을 수 없음: {document_id}"
            )

        # 템플릿 기반 필드 추출
        fields = await ocr_engine.extract_fields(
            text=document.text_content, template_id=template_id
        )

        # 결과 반환
        return {
            "document_id": document_id,
            "fields": fields,
            "template_id": template_id,
        }
    except Exception as e:
        logger.error(f"필드 추출 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"필드 추출 실패: {str(e)}")


# 커스텀 헬스 체크 엔드포인트
@app.get("/health")
async def health_check():
    """문서 서비스 상태 확인 엔드포인트"""
    return {
        "status": "ok",
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
        "service": "document-processing",
        "database": {"connected": document_repository.is_connected()},
    }


if __name__ == "__main__":
    try:
        # 환경 변수에서 포트 가져오기, 기본값은 8004
        port = int(os.getenv("DOCUMENT_SERVICE_PORT", settings.PORT))
        logger.info(f"문서 처리 서비스 시작 중... (포트: {port})")

        # uvicorn 서버 설정
        uvicorn_config = {
            "app": "src.main:app",
            "host": "0.0.0.0",
            "port": port,
            "reload": settings.DEBUG,
            "log_level": "info" if not settings.DEBUG else "debug",
            "workers": settings.WORKERS,
        }

        # 서버 실행
        uvicorn.run(**uvicorn_config)
    except Exception as e:
        logger.error(f"문서 처리 서비스 시작 중 오류 발생: {str(e)}")
        raise
