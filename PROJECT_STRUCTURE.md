# 프로젝트 구조

## 모듈

### controllers 모듈
- **파일:** `packages/api/src/controllers/maintenance_controller.py`
  - **클래스:** `MaintenanceController`
    - **함수:** `get_status()` : 정비 시스템 상태 및 정비 정보 조회
    - **함수:** `create_maintenance_record(data: MaintenanceData)` : 정비 기록 생성

### routers 모듈
- **파일:** `packages/api/src/routers/maintenance.py`
  - **GET 엔드포인트:** `/maintenance`
    - **함수:** `get_maintenance_status()` : MaintenanceController의 get_status() 호출
  - **POST 엔드포인트:** `/maintenance`
    - **함수:** `create_maintenance_record(request: MaintenanceRequest)` : MaintenanceController의 create_maintenance_record() 호출
  - **확장 라우트:**
    - **함수:** `extend_maintenance_routes(router: APIRouter)`
    - 추가 엔드포인트:
      - `/vehicle/{vehicle_id}` : 차량별 정비 조회
      - `/scheduled` : 예약 정비 생성
      - `/complete/{maintenance_id}` : 정비 완료 처리
      - `/recommendations/{vehicle_id}` : 정비 권장 사항 조회
      - `/statistics/{vehicle_id}` : 정비 통계 조회

## 기타
- 추후 필요한 기능 및 Legacy 코드 정리 예정 