from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from uuid import uuid4
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from backend.core.tasks import TaskManager, run_in_background, run_task_with_progress
import asyncio

router = APIRouter(prefix="/tasks", tags=["작업"])

class TaskResponse(BaseModel):
    id: str
    description: str
    status: str
    progress: int
    created_at: float
    updated_at: float
    result: Optional[Any] = None
    error: Optional[str] = None

class TaskCreate(BaseModel):
    description: str
    task_type: str
    parameters: Dict[str, Any] = {}

async def demo_task(task_id: str, delay: int = 10, fail: bool = False):
    """데모용 장기 실행 작업입니다."""
    for i in range(1, 11):
        # 진행 상태 업데이트
        TaskManager.update_task(
            task_id, 
            progress=i * 10
        )
        
        # 작업 시뮬레이션
        await asyncio.sleep(delay / 10)
        
        # 실패 케이스
        if fail and i > 5:
            raise ValueError("작업 실행 중 오류가 발생했습니다.")
    
    return {"success": True, "message": "작업이 완료되었습니다."}

@router.post("", response_model=TaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_task(task_data: TaskCreate, background_tasks: BackgroundTasks):
    """
    새로운 백그라운드 작업을 생성합니다.
    
    현재 지원되는 작업 유형:
    - demo: 데모용 장기 실행 작업
    """
    task_id = f"{task_data.task_type}-{uuid4()}"
    
    # 작업 등록
    TaskManager.create_task(
        task_id=task_id, 
        description=task_data.description,
        task_type=task_data.task_type,
        parameters=task_data.parameters
    )
    
    # 작업 유형에 따라 적절한 코루틴 실행
    if task_data.task_type == "demo":
        delay = task_data.parameters.get("delay", 10)
        fail = task_data.parameters.get("fail", False)
        
        # 백그라운드 작업 실행
        coroutine = demo_task(task_id=task_id, delay=delay, fail=fail)
        task = run_in_background(run_task_with_progress(task_id, coroutine))
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원되지 않는 작업 유형: {task_data.task_type}"
        )
    
    # 생성된 작업 정보 반환
    task_info = await TaskManager.get_task(task_id)
    return task_info

@router.get("", response_model=List[TaskResponse])
async def get_all_tasks():
    """모든 작업 목록을 조회합니다."""
    return await TaskManager.get_all_tasks()

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """특정 작업의 상태를 조회합니다."""
    task = await TaskManager.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"작업을 찾을 수 없습니다: {task_id}"
        )
    
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str):
    """작업을 삭제합니다."""
    task = await TaskManager.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"작업을 찾을 수 없습니다: {task_id}"
        )
    
    await TaskManager.remove_task(task_id)
    return {} 