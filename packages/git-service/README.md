# GitManager - Git 저장소 관리 서비스

이 패키지는 Git 저장소 관리를 위한 표준화된 인터페이스를 제공합니다.

## 기능

- Git 저장소 조작 (클론, 커밋, 브랜치, 태그 등)
- 고급 캐싱 메커니즘을 통한 성능 최적화
- 일관된 예외 처리 및 타입 정의
- 다양한 환경(서버, 클라이언트)에서 사용 가능한 통합 API

## 설치

```bash
pip install gitmanager
```

또는 개발 목적으로 소스에서 직접 설치:

```bash
git clone https://github.com/yourusername/maintenance-monorepo.git
cd maintenance-monorepo/packages/git-service
pip install -e .
```

## 사용 방법

### 기본 사용법

```python
from gitmanager import GitService

# Git 서비스 인스턴스 생성
git_service = GitService('/path/to/repo')

# 저장소 상태 확인
status = git_service.get_status()
print(f"현재 브랜치: {status['branch']}")
print(f"수정된 파일: {status['modified_files']}")

# 커밋 이력 조회
commits = git_service.get_commit_history(limit=10)
for commit in commits:
    print(f"{commit['hash'][:7]} - {commit['message']}")

# 변경사항 커밋
result = git_service.commit_changes("파일 업데이트")
if result['success']:
    print(f"커밋 성공: {result['commit_hash']}")
else:
    print(f"커밋 실패: {result['error']}")
```

### FastAPI와 함께 사용

```python
from fastapi import FastAPI, Depends
from gitmanager import GitService

app = FastAPI()

def get_git_service():
    return GitService('/path/to/repo')

@app.get("/git/status")
async def git_status(git_service: GitService = Depends(get_git_service)):
    return git_service.get_status()

@app.get("/git/commits")
async def git_commits(
    limit: int = 10,
    git_service: GitService = Depends(get_git_service)
):
    return git_service.get_commit_history(limit=limit)
```

## 개발 설정

개발 종속성 설치:

```bash
pip install -e ".[dev]"
```

테스트 실행:

```bash
pytest
```

코드 포맷팅:

```bash
black gitmanager
isort gitmanager
```

타입 체크:

```bash
mypy gitmanager
```

## 라이선스

이 프로젝트는 MIT 라이선스에 따라 라이선스가 부여됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 기여

이슈를 제출하거나 풀 리퀘스트를 통해 기여할 수 있습니다. 모든 기여는 환영합니다! 