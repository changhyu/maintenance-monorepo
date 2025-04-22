# Git 서비스 모듈

Git 저장소 관리를 위한 서비스 모듈입니다. 이 모듈은 차량 정비 관리 시스템의 백엔드에서 Git 저장소 작업을 수행하는 데 사용됩니다.

## 모듈 구조

```
git/
├── services/
│   └── git_service.py  # Git 작업을 처리하는 서비스 클래스
└── tests/
    └── test_git_service.py  # Git 서비스 테스트
```

## 주요 기능

`GitService` 클래스는 다음과 같은 주요 기능을 제공합니다:

- **저장소 상태 조회**: 브랜치 정보, 수정된 파일 수, 마지막 커밋 정보 등을 조회
- **커밋 생성**: 변경사항을 커밋
- **원격 저장소 동기화**: pull 및 push 작업
- **병합 충돌 해결**: 병합 충돌 자동 해결 전략 제공
- **커밋 히스토리 조회**: 커밋 이력 조회

## 사용 방법

```python
from packages.api.src.services.git_service import GitService

# GitService 인스턴스 생성 (경로 미지정 시 프로젝트 루트 사용)
git_service = GitService()

# 저장소 상태 조회
status = git_service.get_status()
print(f"현재 브랜치: {status['branch']}")
print(f"변경 파일 수: {status['modified_files']}")

# 커밋 생성
commit_result = git_service.create_commit("파일 수정")
print(f"커밋 해시: {commit_result['commit']}")

# 원격 저장소에서 변경사항 가져오기
pull_result = git_service.pull()

# 원격 저장소로 변경사항 푸시하기
push_result = git_service.push()
```

## 테스트 실행

테스트는 unittest 프레임워크를 사용하여 작성되었습니다. 다음 명령으로 테스트를 실행할 수 있습니다:

```bash
cd git/tests
PYTHONPATH=../.. python test_git_service.py
```

## 관련 모듈

이 서비스 모듈 외에도 다음 모듈들이 관련되어 있습니다:

- `packages/api/servers/src/git`: Git 서버 모듈 (Git 작업을 위한 API 제공)
- `packages/api/src/controllers/maintenance_controller.py`: 정비 컨트롤러 (GitService 사용) 