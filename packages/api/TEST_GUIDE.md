# API 테스트 가이드

이 문서는 API 서비스 패키지의 테스트 실행 방법과 테스트 오류 해결 가이드를 제공합니다.

## 테스트 환경 설정

1. 환경 변수 설정 확인
   - `.env` 파일에 다음 내용이 포함되어 있는지 확인하세요:
   ```
   DEBUG=true
   ENVIRONMENT=development
   HOST=0.0.0.0
   PORT=8081
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/maintenance
   ```

2. 필요한 패키지 설치
   ```bash
   pip install -r requirements.txt
   pip install pytest pytest-asyncio python-multipart freezegun git-python
   ```

## 일반 테스트 실행

1. 전체 테스트 실행
   ```bash
   python -m pytest
   ```

2. 특정 테스트만 실행
   ```bash
   python -m pytest tests/test_maintenance_service.py
   ```

3. 자세한 출력과 함께 실행
   ```bash
   python -m pytest tests/test_maintenance_service.py -v
   ```

4. 특정 테스트 클래스만 실행
   ```bash
   python -m pytest tests/test_maintenance_service.py::TestMaintenanceService
   ```

5. 특정 테스트 메서드만 실행
   ```bash
   python -m pytest tests/test_maintenance_service.py::TestMaintenanceService::test_create_maintenance_record
   ```

## 일반적인 테스트 오류 해결 방법

### 1. `PROTECTED_KEY_PREFIX` 문제

만약 `PROTECTED_KEY_PREFIX is not defined` 오류가 발생하면:

```python
# src/core/cache/constants.py 파일 끝에 다음 코드 추가
PROTECTED_KEY_PREFIX = "protected:"
```

### 2. 모듈을 찾을 수 없는 경우

테스트에서 모듈을 찾을 수 없다는 오류가 발생하면 상대 경로 대신 절대 경로로 수정하세요:

```python
# 변경 전
from ..core.metrics import metrics_collector

# 변경 후
from src.core.metrics import metrics_collector
```

### 3. 테스트에 필요한 서비스가 없는 경우

`maintenance_service.py`와 같은 필요한 서비스 파일이 없다면 구현해주세요:

```bash
mkdir -p src/services
touch src/services/maintenance_service.py
```

### 4. 환경 변수 오류

환경 변수 관련 오류가 발생하면 `.env` 파일을 통해 필요한 설정을 추가하거나, 테스트 코드에서 직접 설정할 수 있습니다:

```python
# 테스트 파일 상단에 추가
import os
os.environ['HOST'] = '0.0.0.0'
os.environ['PORT'] = '8081'
```

### 5. 임시 데이터베이스 사용

테스트 전용 데이터베이스를 사용하려면:

```python
# conftest.py 파일에 추가
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="session")
def engine():
    return create_engine("sqlite:///:memory:")
    
@pytest.fixture(scope="session")
def tables(engine):
    # 여기서 테이블 생성
    Base.metadata.create_all(engine)
    yield
    # 테스트 후 정리
    Base.metadata.drop_all(engine)

@pytest.fixture
def db_session(engine, tables):
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker()(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()
```

## 특정 테스트 건너뛰기

해결이 어려운 특정 테스트는 `@pytest.mark.skip` 데코레이터를 사용하여 건너뛸 수 있습니다:

```python
@pytest.mark.skip(reason="이 테스트는 현재 구현되지 않은 기능을 테스트합니다")
def test_some_future_feature():
    # 테스트 코드
```

## 추가 문서

더 자세한 내용은 아래 문서를 참조하세요:
- [pytest 공식 문서](https://docs.pytest.org/)
- [FastAPI 테스팅 가이드](https://fastapi.tiangolo.com/tutorial/testing/) 