# GitService API 개선 - 객체 직접 반환 메서드 추가

## 개요

이 PR은 GitService 클래스에 객체를 직접 반환하는 새로운 메서드들을 추가합니다. 이는 향후 메이저 버전 업데이트(v2.0.0)에서 계획된 API 개선을 위한 사전 작업으로, 개발자들이 점진적으로 새로운 API로 마이그레이션할 수 있도록 지원합니다.

## 변경 내용

### 신규 추가된 메서드

다음 메서드들이 추가되었습니다:

1. `get_branch_objects()`: `List[GitBranch]` 객체를 직접 반환
2. `get_remote_objects()`: `List[GitRemote]` 객체를 직접 반환
3. `get_tag_objects()`: `List[GitTag]` 객체를 직접 반환
4. `get_config_object()`: `GitConfig` 객체를 직접 반환

### 문서화

- 새로운 문서 `/docs/git_service_python_api.md` 추가: GitService Python API 마이그레이션 가이드

### 테스트

- 새로운 테스트 파일 `tests/git/core/test_service.py` 추가: 새 메서드의 기능 테스트

## 동기

- 현재 GitService 클래스는 딕셔너리를 반환하는 방식이지만, 향후 메이저 버전 업데이트에서는 객체를 직접 반환하는 방식으로 변경될 예정
- 이번 PR은 기존 API 호환성을 유지하면서도 개발자들이 점진적으로 새 API로 마이그레이션할 수 있는 경로를 제공
- 객체 지향적 접근 방식으로의 전환을 통해 타입 안전성과 API 일관성 향상

## 주의 사항

- 기존 API는 변경되지 않았으며 계속 사용 가능
- 호환성을 유지하기 위해 기존 메서드들은 계속 딕셔너리를 반환
- 향후 v2.0.0에서는 객체 반환이 기본 동작으로 변경될 예정

## 테스트 방법

아래 명령으로 테스트를 실행하여 새 메서드의 기능을 검증할 수 있습니다:

```bash
python -m pytest tests/git/core/test_service.py -v
```

## 관련 이슈

- #142 GitService API 개선 계획
- #256 객체 지향적 API로의 전환