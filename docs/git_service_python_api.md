# Git Service Python API 마이그레이션 가이드

## 개요

이 문서는 GitService 클래스의 Python API 사용 방법과 향후 메이저 버전 업데이트에 대비한 마이그레이션 가이드를 제공합니다.

## 버전 정보

- **현재 API 버전**: 1.1.0
- **다음 메이저 버전**: 2.0.0 (예정)
- **마지막 업데이트**: 2025-04-26

## 주요 변경 예정 사항

현재 GitService 클래스는 메서드 호출 결과로 대부분 딕셔너리를 반환합니다. 향후 메이저 버전 업데이트(v2.0.0)에서는 객체 중심 API로 전환되어 직접 객체를 반환하는 방식으로 변경될 예정입니다.

이러한 변화에 미리 대비할 수 있도록, 현재 버전(v1.x.x)에서는 객체를 직접 반환하는 새로운 메서드들이 추가되었습니다.

## 신규 추가된 객체 반환 메서드

| 기존 메서드 | 신규 메서드 | 반환 타입 | 설명 |
|------------|-----------|------------|------|
| `get_branches()` | `get_branch_objects()` | `List[GitBranch]` | GitBranch 객체 목록을 반환합니다. |
| `get_remotes()` | `get_remote_objects()` | `List[GitRemote]` | GitRemote 객체 목록을 반환합니다. |
| `get_tags()` | `get_tag_objects()` | `List[GitTag]` | GitTag 객체 목록을 반환합니다. |
| `get_config()` | `get_config_object()` | `GitConfig` | GitConfig 객체를 반환합니다. |

## 사용 예제

### 기존 API 사용 방식 (v1.x.x)

```python
from gitmanager.git.core.service import GitService

# 서비스 인스턴스 생성
git_service = GitService(repository_path="/path/to/repo")

# 브랜치 목록 조회 (딕셔너리 반환)
branches = git_service.get_branches()
for branch in branches:
    print(f"브랜치 이름: {branch['name']}, 현재 브랜치: {branch['is_current']}")

# 원격 저장소 목록 조회 (딕셔너리 반환)
remotes = git_service.get_remotes()
for remote in remotes:
    print(f"원격 이름: {remote['name']}, URL: {remote['url']}")

# 태그 목록 조회 (딕셔너리 반환)
tags = git_service.get_tags()
for tag in tags:
    print(f"태그 이름: {tag['name']}, 커밋: {tag['commit_hash']}")

# 설정 조회 (딕셔너리 반환)
config = git_service.get_config()
print(f"사용자 이름: {config['user'].get('name')}")
```

### 새로운 API 사용 방식 (v2.0.0 대비)

```python
from gitmanager.git.core.service import GitService

# 서비스 인스턴스 생성
git_service = GitService(repository_path="/path/to/repo")

# 브랜치 목록 조회 (GitBranch 객체 반환)
branches = git_service.get_branch_objects()
for branch in branches:
    print(f"브랜치 이름: {branch.name}, 현재 브랜치: {branch.is_current}")

# 원격 저장소 목록 조회 (GitRemote 객체 반환)
remotes = git_service.get_remote_objects()
for remote in remotes:
    print(f"원격 이름: {remote.name}, URL: {remote.url}")

# 태그 목록 조회 (GitTag 객체 반환)
tags = git_service.get_tag_objects()
for tag in tags:
    print(f"태그 이름: {tag.name}, 커밋: {tag.commit_hash}")

# 설정 조회 (GitConfig 객체 반환)
config = git_service.get_config_object()
print(f"사용자 이름: {config.user.name if hasattr(config, 'user') and hasattr(config.user, 'name') else None}")
```

## 마이그레이션 전략

1. **단계적 마이그레이션**: 코드를 점진적으로 업데이트하여 새로운 객체 반환 메서드를 사용하도록 변경하세요.

2. **타입 힌팅 활용**: 타입 힌팅을 활용하여 반환 타입을 명확히 하세요.
   ```python
   from gitmanager.git.core.types import GitBranch
   
   def get_active_branches(service: GitService) -> List[GitBranch]:
       return [b for b in service.get_branch_objects() if not b.is_remote]
   ```

3. **객체 메서드 활용**: 반환된 객체의 메서드와 속성을 활용하여 코드를 간결하게 작성하세요.

## 향후 계획

- **v2.0.0 (2025년 하반기 예정)**: 기존 메서드들은 객체를 반환하는 방식으로 변경되고, 딕셔너리 반환 메서드는 별도 제공될 예정입니다.
- **v1.x.x 지원 종료 (2026년 예정)**: v2.0.0 출시 후 1년간 v1.x.x 버전이 지원될 예정입니다.

## 객체 타입 정보

객체 반환 메서드에서 사용하는 주요 클래스들은 다음과 같습니다:

- `GitBranch`: 브랜치 정보를 담고 있는 클래스
  - 주요 속성: `name`, `is_current`, `is_remote`, `upstream`
  
- `GitRemote`: 원격 저장소 정보를 담고 있는 클래스
  - 주요 속성: `name`, `url`, `fetch_url`
  
- `GitTag`: 태그 정보를 담고 있는 클래스
  - 주요 속성: `name`, `commit_hash`, `message`, `tagger_name`, `tagger_email`, `date`
  
- `GitConfig`: Git 설정 정보를 담고 있는 클래스
  - 주요 섹션: `user`, `core`, `remote`

## 도움이 필요하신가요?

마이그레이션 과정에서 문제가 발생하거나 추가 도움이 필요한 경우 다음 방법으로 지원을 받을 수 있습니다:
- 깃허브 이슈 생성: [GitHub Issues](https://github.com/example/maintenance-monorepo/issues)
- 개발팀 문의: [dev-support@example.com](mailto:dev-support@example.com)