# GitService 모듈

이 프로젝트는 Git 저장소를 관리하기 위한 Python 래퍼 라이브러리입니다.

## 주요 기능

- Git 저장소 상태 확인
- 커밋 생성 및 관리
- 원격 저장소와의 동기화 (풀/푸시)
- 병합 충돌 해결
- 커밋 이력 조회 및 관리

## 설치 방법

### 요구사항

- Python 3.7 이상
- Git (명령줄 도구)
- GitPython (선택적 의존성)

### 설치

```bash
# 저장소 클론
git clone https://github.com/username/maintenance-monorepo.git
cd maintenance-monorepo

# 패키지 설치
pip install -e .

# 또는 요구 사항만 설치
pip install -r requirements.txt

# 개발 패키지 설치
pip install -r requirements-dev.txt
```

### GitPython 의존성 설치

일부 기능은 GitPython 라이브러리를 사용합니다. GitPython을 설치하려면:

```bash
pip install gitpython
```

### 직접 실행

```bash
# 셸 스크립트로 실행 (Unix/Linux/Mac)
bash run_via_bash.sh

# Python으로 실행
python run_via_python.py
```

## 사용 예시

### 기본 사용법

```python
from gitmanager.git.core.service import GitService

# Git 서비스 초기화
repo_path = "/path/to/your/repo"
git = GitService(repo_path)

# 저장소 상태 확인
status = git.get_status()
print(f"현재 브랜치: {status['branch']}")
print(f"변경된 파일: {status['modified']}")

# 변경 사항 커밋
message = "새로운 기능 추가"
git.create_commit(message)
print("변경 사항이 커밋되었습니다.")

# 원격 저장소에서 변경 사항 가져오기
git.pull()
print("원격 저장소에서 최신 변경 사항을 가져왔습니다.")

# 원격 저장소로 변경 사항 푸시
git.push()
print("로컬 변경 사항이 원격 저장소로 푸시되었습니다.")
```

### 고급 기능

```python
# 커밋 이력 조회
history = git.get_log(limit=5)
for commit in history:
    print(f"커밋: {commit['hash']}")
    print(f"작성자: {commit['author']}")
    print(f"날짜: {commit['date']}")
    print(f"메시지: {commit['message']}")
    print("---")

# 병합 충돌 해결
try:
    git.pull()
except GitOperationException as e:
    print(f"병합 충돌 발생: {e}")
    # 충돌 해결
    conflicts = git.get_status().status.conflicts
    # 충돌 해결 후 자동으로 해결
    git.resolve_merge_conflicts(strategy="ours")  # 또는 "theirs"
    # 또는 수동으로 파일 편집 후
    git.create_commit("병합 충돌 해결")
```

## 테스트 실행

```bash
# 모든 테스트 실행
python run_tests.py --all

# Git 관련 테스트 실행
python run_tests.py --git

# GitManager 테스트 실행
python run_tests.py --gitmanager

# 특정 테스트 파일 실행
python run_tests.py --test-file git_tests/test_git_service.py

# 상세 출력과 함께 테스트 실행
python run_tests.py --all --verbose

# JUnit XML 보고서 생성
python run_tests.py --all --junit
```

추가적인 테스트 옵션을 확인하려면:

```bash
python run_tests.py -h
```

### 테스트 환경 설정

테스트를 실행하기 전 필요한 환경 설정:

```bash
# 필수 패키지 설치
pip install -r requirements-dev.txt

# GitPython 설치
pip install gitpython

# 테스트 환경 설정
python setup_test_env.py
```

## 모듈 구조

```
gitmanager/
├── __init__.py         # 모듈 초기화 및 기본 임포트
├── pytestcompat.py     # pytest 호환성 모듈
└── git/                # Git 관련 모듈
    ├── __init__.py     # Git 모듈 초기화
    ├── core/           # 핵심 기능
    │   ├── __init__.py
    │   ├── service.py  # GitService 클래스
    │   ├── types.py    # 타입 정의
    │   ├── utils.py    # 유틸리티 함수
    │   └── exceptions.py # 예외 클래스
    ├── interfaces/     # 인터페이스 정의
    │   └── __init__.py
    ├── services/       # 부가 서비스
    │   └── __init__.py
    └── tests/          # Git 모듈 테스트
        └── __init__.py

git_tests/              # 독립 테스트 디렉토리
├── __init__.py
├── test_git_integration.py
├── test_git_service.py
└── git_lib.py
```

## 주요 클래스 및 함수

### GitService

```python
class GitService:
    """Git 저장소 관리 및 작업을 위한 서비스 클래스"""
    
    def __init__(self, repo_path: str):
        """Git 서비스 초기화"""
        
    def get_status(self) -> GitStatusResult:
        """저장소 상태 조회"""
        
    def create_commit(self, message: str, files: Optional[List[str]] = None) -> CommitResponse:
        """변경사항 커밋"""
        
    def pull(self, remote: str = "origin", branch: Optional[str] = None) -> PullPushResult:
        """원격 저장소에서 변경사항 가져오기"""
        
    def push(self, remote: str = "origin", branch: Optional[str] = None) -> PullPushResultWithChanges:
        """원격 저장소로 변경사항 푸시"""
        
    def create_branch(self, name: str) -> BranchInfo:
        """새 브랜치 생성"""
        
    def delete_branch(self, name: str) -> bool:
        """브랜치 삭제"""
        
    def switch_branch(self, name: str) -> BranchInfo:
        """브랜치 전환"""
        
    def list_branches(self) -> List[BranchInfo]:
        """브랜치 목록 조회"""
        
    def get_log(self, limit: int = 10, skip: int = 0, branch: str = None, path: str = None) -> List[CommitInfo]:
        """커밋 로그 조회"""
        
    def merge_branches(self, source: str, target: str = None) -> MergeConflictResult:
        """브랜치 병합"""
        
    def resolve_merge_conflicts(self) -> MergeConflictResult:
        """병합 충돌 해결"""
        
    def get_remotes(self) -> List[GitRemote]:
        """원격 저장소 목록 조회"""
        
    def add_remote(self, name: str, url: str) -> bool:
        """원격 저장소 추가"""
        
    def remove_remote(self, name: str) -> bool:
        """원격 저장소 제거"""
        
    def create_tag(self, name: str, message: str = "", commit: str = "HEAD") -> bool:
        """태그 생성"""
        
    def delete_tag(self, name: str) -> bool:
        """태그 삭제"""
```

## 보안 취약점 관리

이 프로젝트는 보안 취약점을 효과적으로 관리하기 위한 여러 도구와 프로세스를 포함하고 있습니다.

### 보안 명령어

```bash
# 보안 취약점 수정
npm run security:fix

# 향상된 보안 테스트 실행
npm run security:test

# 보안 수정 및 테스트 한 번에 실행
npm run security:full
```

### 보안 문서

보안과 관련된 자세한 내용은 다음 문서를 참조하세요:

- [보안 개선 상세 보고서](./SECURITY_IMPROVEMENTS.md)
- [보안 개선 최종 요약](./SECURITY_SUMMARY.md)

### 보안 취약점 보고

보안 취약점을 발견하신 경우, 즉시 보안 담당자에게 보고해 주세요. 이메일: security@example.com

## 기여하기

1. 저장소를 포크합니다.
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`).
3. 변경 사항을 커밋합니다 (`git commit -m 'feat: 놀라운 기능 추가'`).
4. 브랜치를 푸시합니다 (`git push origin feature/amazing-feature`).
5. Pull Request를 생성합니다.

## 라이선스

MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 최근 버그 수정 및 개선사항

### v0.2.1 (2023-05-30)

#### 버그 수정
1. **임포트 경로 수정**
   - `gitmanager/__init__.py`에서 잘못된 임포트 경로 수정: `gitmanagerservices.git_service` → `gitmanager.git.core.service`
   - `git_tests/test_git_service.py`에서 잘못된 임포트 경로 수정: `gitmanager.services.git_service` → `gitmanager.git.core.service`

2. **README 업데이트**
   - 사용 예시에서 잘못된 임포트 경로 수정
   - 실제 코드 구조와 일치하도록 모듈 구조 설명 업데이트
   - 클래스 및 메서드 설명 업데이트
   - 테스트 실행 방법 업데이트

#### 개선사항
1. **문서 개선**
   - 실제 프로젝트 구조를 명확하게 문서화
   - 테스트 실행 방법 구체화
   - API 문서 타입 힌트 추가

2. **테스트 환경**
   - GitPython 의존성 명확화
   - 테스트 환경 설정 방법 개선

### 다음 버전 계획

1. **성능 최적화**
   - 대용량 저장소 처리 성능 개선
   - 메모리 사용량 최적화

2. **새로운 기능**
   - 서브모듈 관리 기능 추가
   - 고급 diff 시각화 기능

# GitService 개선 결과

## 최근 개선 내용

GitService 클래스에 다음과 같은 개선이 이루어졌습니다:

1. **캐싱 메커니즘 적용**
   - 상태 정보, 브랜치 목록, 태그 목록, 커밋 히스토리 등에 대한 캐싱 적용
   - TTL 기반의 캐시 만료 기능 구현
   - 적응형 캐싱으로 자주 사용되는 데이터의 캐시 수명 연장

2. **병렬 처리 도입**
   - 여러 파일 이력 동시 조회 (`get_multiple_files_history`)
   - 여러 커밋 정보 일괄 조회 (`get_commits_batch`)
   - 파일 검색 병렬화 (`find_file_in_history`)

3. **파일 이력 조회 개선**
   - 첫 번째 커밋에 대한 처리 로직 개선
   - 오류 처리 강화 및 예외 상황 대응

4. **기여자 정보 조회 기능 추가**
   - 커밋 기여자 조회 (`get_commit_contributors`)
   - 파일 기여자 조회 (`get_file_contributors`)

## 성능 벤치마크 결과

### 병렬 처리 성능 향상

| 작업 | 순차 처리 | 병렬 처리 | 성능 향상 |
|------|----------|-----------|---------|
| 파일 이력 조회 | 1.4505초 | 0.0024초 | 99.83% |
| 커밋 정보 조회 | 0.0953초 | 0.0314초 | 67.05% |
| 파일 이력 검색 | 0.2851초 | 0.0842초 | 70.45% |
| 파일 작업 처리 | 0.2516초 | 0.0735초 | 70.80% |

### 캐싱 성능 향상

메서드별 캐싱 성능 개선 결과는 `benchmark_caching.py` 스크립트를 실행하여 확인할 수 있습니다.

## 사용 예제

### 캐싱 사용

```python
# 캐시 사용
status = git_service.get_status(use_cache=True)

# 캐시 사용하지 않음 (최신 데이터 조회)
status = git_service.get_status(use_cache=False)
```

### 병렬 처리 사용

```python
# 여러 파일의 이력을 병렬로 조회
result = git_service.get_multiple_files_history(
    file_paths=["file1.txt", "file2.txt", "file3.txt"],
    use_parallel=True
)

# 여러 커밋 정보를 병렬로 조회
result = git_service.get_commits_batch(
    commit_hashes=["abc123", "def456", "ghi789"],
    use_parallel=True
)
```

### 파일 검색

```python
# Git 히스토리에서 파일 검색
result = git_service.find_file_in_history(
    search_pattern="config",
    use_parallel=True,
    max_depth=10
)
```

### 기여자 정보 조회

```python
# 커밋 기여자 조회
contributors = git_service.get_commit_contributors(commit_hash="HEAD")

# 파일 기여자 조회
file_contributors = git_service.get_file_contributors(file_path="src/main.py")
```

## 벤치마크 실행 방법

병렬 처리 성능 벤치마크 실행:
```
python benchmark_parallel.py
```

캐싱 성능 벤치마크 실행:
```
python benchmark_caching.py
```