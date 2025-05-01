"""
Git 작업 로깅 기능 테스트

이 모듈은 Git API의 쓰기 작업 및 작업 로깅 기능을 테스트합니다.
"""
import warnings
import pytest
from unittest.mock import patch, MagicMock
import json
from sqlalchemy.orm import Session
import os

from backend.models.git_operation_log import GitOperationLog, GitOperationType, GitOperationStatus
from backend.models.user import User
from backend.models.role import Role
from backend.models.permission import Permission, RolePermission
from backend.core.auth import create_access_token
from backend.core.security import get_password_hash

# 외부 라이브러리 경고 필터링
warnings.filterwarnings("ignore", message="Please use `import python_multipart` instead")
warnings.filterwarnings("ignore", message="The 'app' shortcut is now deprecated")

# Mock for has_permission function to always return True
def mock_has_permission(*args, **kwargs):
    return True

# Mock for os.path.exists to make the git add test pass
def mock_os_path_exists(path):
    return True

# Git 서비스 패치용 모의 객체 확장 (쓰기 작업 지원)
class MockGitService:
    def __init__(self, *args, **kwargs):
        pass
        
    def get_status(self, use_cache=True):
        return {
            "branch": "main",
            "modified_files": 2,
            "untracked_files": 1,
            "staged_files": 1,
            "last_commit": {
                "hash": "abc1234",
                "author": "Test User",
                "message": "Test commit",
                "date": "2025-04-25T10:00:00"
            }
        }
        
    def list_branches(self):
        return [
            {"name": "main", "current": True, "remote": False},
            {"name": "develop", "current": False, "remote": False}
        ]
        
    def _run_git_command(self, args):
        # 다양한 Git 명령어 결과 시뮬레이션
        if args[0] == "add":
            return ""
        elif args[0] == "commit":
            return "[main abc1234] Test commit message\n 1 file changed, 10 insertions(+), 5 deletions(-)"
        elif args[0] == "reset":
            return ""
        elif args[0] == "branch":
            if len(args) > 1:
                return f"브랜치 '{args[1]}'이(가) 생성되었습니다."
            return ""
        elif args[0] == "checkout":
            return f"브랜치 '{args[1]}'(으)로 전환되었습니다."
        elif args[0] == "pull":
            return "Already up to date."
        elif args[0] == "push":
            return "Everything up-to-date"
        return ""

# 테스트를 위한 픽스처
@pytest.fixture
def mock_db_session(test_db):
    """테스트용 데이터베이스 세션"""
    # 필요한 권한 생성
    git_read_perm = test_db.query(Permission).filter_by(name="git:read").first()
    if not git_read_perm:
        git_read_perm = Permission(name="git:read", description="Git 리소스 읽기 권한")
        test_db.add(git_read_perm)
    
    git_write_perm = test_db.query(Permission).filter_by(name="git:write").first()
    if not git_write_perm:
        git_write_perm = Permission(name="git:write", description="Git 리소스 쓰기 권한")
        test_db.add(git_write_perm)
    
    admin_read_perm = test_db.query(Permission).filter_by(name="admin:read").first()
    if not admin_read_perm:
        admin_read_perm = Permission(name="admin:read", description="관리자 읽기 권한")
        test_db.add(admin_read_perm)
        
    test_db.flush()
    
    # 테스트 실행 전 역할 생성
    git_manager_role = test_db.query(Role).filter_by(name="GitManager").first()
    if not git_manager_role:
        git_manager_role = Role(name="GitManager", description="Git 담당자")
        test_db.add(git_manager_role)
    
    admin_role = test_db.query(Role).filter_by(name="Admin").first()
    if not admin_role:
        admin_role = Role(name="Admin", description="관리자")
        test_db.add(admin_role)
    
    user_role = test_db.query(Role).filter_by(name="User").first()
    if not user_role:
        user_role = Role(name="User", description="일반 사용자")
        test_db.add(user_role)
    
    test_db.flush()
    
    # 역할-권한 관계 설정
    if not test_db.query(RolePermission).filter_by(
        role_id=git_manager_role.id, 
        permission_id=git_write_perm.id
    ).first():
        test_db.add(RolePermission(
            role_id=git_manager_role.id, 
            permission_id=git_write_perm.id
        ))
    
    if not test_db.query(RolePermission).filter_by(
        role_id=git_manager_role.id, 
        permission_id=git_read_perm.id
    ).first():
        test_db.add(RolePermission(
            role_id=git_manager_role.id, 
            permission_id=git_read_perm.id
        ))
    
    # Admin 역할에 모든 권한 부여
    if not test_db.query(RolePermission).filter_by(
        role_id=admin_role.id, 
        permission_id=git_read_perm.id
    ).first():
        test_db.add(RolePermission(role_id=admin_role.id, permission_id=git_read_perm.id))
        
    if not test_db.query(RolePermission).filter_by(
        role_id=admin_role.id, 
        permission_id=git_write_perm.id
    ).first():
        test_db.add(RolePermission(role_id=admin_role.id, permission_id=git_write_perm.id))
        
    if not test_db.query(RolePermission).filter_by(
        role_id=admin_role.id, 
        permission_id=admin_read_perm.id
    ).first():
        test_db.add(RolePermission(role_id=admin_role.id, permission_id=admin_read_perm.id))
    
    # User 역할에 git:read 권한만 부여
    if not test_db.query(RolePermission).filter_by(
        role_id=user_role.id, 
        permission_id=git_read_perm.id
    ).first():
        test_db.add(RolePermission(role_id=user_role.id, permission_id=git_read_perm.id))
    
    test_db.flush()
    
    # 테스트 사용자 생성
    git_manager = test_db.query(User).filter_by(email="test_git_manager@example.com").first()
    if not git_manager:
        git_manager = User(
            username="test_git_manager",
            email="test_git_manager@example.com",
            hashed_password=get_password_hash("password"),
            is_active=True,
            role_id=git_manager_role.id
        )
        test_db.add(git_manager)
    
    admin_user = test_db.query(User).filter_by(email="test_admin@example.com").first()
    if not admin_user:
        admin_user = User(
            username="test_admin",
            email="test_admin@example.com",
            hashed_password=get_password_hash("password"),
            is_active=True,
            role_id=admin_role.id
        )
        test_db.add(admin_user)
    
    regular_user = test_db.query(User).filter_by(email="test_user@example.com").first()
    if not regular_user:
        regular_user = User(
            username="test_user",
            email="test_user@example.com",
            hashed_password=get_password_hash("password"),
            is_active=True,
            role_id=user_role.id
        )
        test_db.add(regular_user)
    
    test_db.commit()
    
    yield test_db
    
    # 테스트 후 Git 로그 데이터 정리
    test_db.query(GitOperationLog).delete()
    test_db.commit()

# Git 관리자 토큰과 헤더를 위한 픽스처 추가
@pytest.fixture(scope="function")
def git_manager_token():
    """Git 관리자 토큰 픽스처"""
    access_token = create_access_token(
        data={"sub": "test_git_manager@example.com", "role": "GitManager"},
        expires_delta=None
    )
    return access_token

@pytest.fixture(scope="function")
def git_manager_headers(git_manager_token):
    """Git 관리자 인증 헤더 픽스처"""
    return {"Authorization": f"Bearer {git_manager_token}"}

# 관리자 토큰과 헤더를 위한 픽스처 추가
@pytest.fixture(scope="function")
def admin_token():
    """관리자 토큰 픽스처"""
    access_token = create_access_token(
        data={"sub": "test_admin@example.com", "role": "Admin"},
        expires_delta=None
    )
    return access_token

@pytest.fixture(scope="function")
def admin_headers(admin_token):
    """관리자 인증 헤더 픽스처"""
    return {"Authorization": f"Bearer {admin_token}"}

# 일반 사용자 토큰과 헤더를 위한 픽스처 추가
@pytest.fixture(scope="function")
def user_token():
    """일반 사용자 토큰 픽스처"""
    access_token = create_access_token(
        data={"sub": "test_user@example.com", "role": "User"},
        expires_delta=None
    )
    return access_token

@pytest.fixture(scope="function")
def user_headers(user_token):
    """일반 사용자 인증 헤더 픽스처"""
    return {"Authorization": f"Bearer {user_token}"}

# Git 작업 (git add)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
@patch("backend.core.auth.has_permission", mock_has_permission)
@patch("os.path.exists", mock_os_path_exists)
def test_git_add(client, git_manager_headers, mock_db_session):
    """파일 스테이징(git add) 작업 및 로깅 테스트"""
    # 파일 스테이징 요청
    files = ["test.py", "README.md"]
    response = client.post(
        "/api/v1/git/add",
        headers=git_manager_headers,
        json={"files": files}
    )
    
    # 응답 상태 확인
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "files" in data["data"]
    assert len(data["data"]["files"]) == 2
    
    # 로그 기록 확인
    logs = mock_db_session.query(GitOperationLog).filter(
        GitOperationLog.operation_type == GitOperationType.ADD
    ).all()
    
    assert len(logs) > 0
    log = logs[0]
    assert log.operation_type == GitOperationType.ADD
    assert log.status == GitOperationStatus.SUCCESS
    assert "스테이징된 파일" in log.details

# Git 작업 (git commit)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
@patch("backend.core.auth.has_permission", mock_has_permission)
def test_git_commit(client, git_manager_headers, mock_db_session):
    """변경사항 커밋(git commit) 작업 및 로깅 테스트"""
    # 커밋 요청
    message = "테스트 커밋 메시지"
    response = client.post(
        "/api/v1/git/commit",
        headers=git_manager_headers,
        json={"message": message}
    )
    
    # 응답 상태 확인
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "message" in data["data"]
    assert data["data"]["message"] == message
    
    # 로그 기록 확인
    logs = mock_db_session.query(GitOperationLog).filter(
        GitOperationLog.operation_type == GitOperationType.COMMIT
    ).all()
    
    assert len(logs) > 0
    log = logs[0]
    assert log.operation_type == GitOperationType.COMMIT
    assert log.status == GitOperationStatus.SUCCESS
    assert log.message == message

# Git 작업 (git branch)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
@patch("backend.core.auth.has_permission", mock_has_permission)
def test_git_branch_create(client, git_manager_headers, mock_db_session):
    """브랜치 생성(git branch) 작업 및 로깅 테스트"""
    # 브랜치 생성 요청
    branch_name = "feature/test"
    response = client.post(
        "/api/v1/git/branch",
        headers=git_manager_headers,
        json={"branch_name": branch_name}
    )
    
    # 응답 상태 확인
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "branch_name" in data["data"]
    assert data["data"]["branch_name"] == branch_name
    
    # 로그 기록 확인
    logs = mock_db_session.query(GitOperationLog).filter(
        GitOperationLog.operation_type == GitOperationType.BRANCH_CREATE
    ).all()
    
    assert len(logs) > 0
    log = logs[0]
    assert log.operation_type == GitOperationType.BRANCH_CREATE
    assert log.status == GitOperationStatus.SUCCESS
    assert log.branch_name == branch_name

# Git 작업 (git checkout)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
@patch("backend.core.auth.has_permission", mock_has_permission)
def test_git_checkout(client, git_manager_headers, mock_db_session):
    """브랜치 전환(git checkout) 작업 및 로깅 테스트"""
    # 브랜치 전환 요청
    branch_name = "develop"
    response = client.post(
        "/api/v1/git/checkout",
        headers=git_manager_headers,
        json={"branch_name": branch_name}
    )
    
    # 응답 상태 확인
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "branch_name" in data["data"]
    assert data["data"]["branch_name"] == branch_name
    
    # 로그 기록 확인
    logs = mock_db_session.query(GitOperationLog).filter(
        GitOperationLog.operation_type == GitOperationType.CHECKOUT
    ).all()
    
    assert len(logs) > 0
    log = logs[0]
    assert log.operation_type == GitOperationType.CHECKOUT
    assert log.status == GitOperationStatus.SUCCESS
    assert log.branch_name == branch_name

# Git 작업 (git pull)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
@patch("backend.core.auth.has_permission", mock_has_permission)
def test_git_pull(client, git_manager_headers, mock_db_session):
    """원격 저장소에서 변경사항 가져오기(git pull) 작업 및 로깅 테스트"""
    # pull 요청
    response = client.post(
        "/api/v1/git/pull",
        headers=git_manager_headers,
        json={"remote": "origin"}
    )
    
    # 응답 상태 확인
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "remote" in data["data"]
    assert data["data"]["remote"] == "origin"
    
    # 로그 기록 확인
    logs = mock_db_session.query(GitOperationLog).filter(
        GitOperationLog.operation_type == GitOperationType.PULL
    ).all()
    
    assert len(logs) > 0
    log = logs[0]
    assert log.operation_type == GitOperationType.PULL
    assert log.status == GitOperationStatus.SUCCESS
    assert "원격 저장소" in log.details

# Git 작업 (git push)
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
@patch("backend.core.auth.has_permission", mock_has_permission)
def test_git_push(client, git_manager_headers, mock_db_session):
    """원격 저장소로 변경사항 푸시하기(git push) 작업 및 로깅 테스트"""
    # push 요청
    response = client.post(
        "/api/v1/git/push",
        headers=git_manager_headers,
        json={"remote": "origin", "force": False}
    )
    
    # 응답 상태 확인
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "remote" in data["data"]
    assert data["data"]["remote"] == "origin"
    assert "force" in data["data"]
    assert data["data"]["force"] is False
    
    # 로그 기록 확인
    logs = mock_db_session.query(GitOperationLog).filter(
        GitOperationLog.operation_type == GitOperationType.PUSH
    ).all()
    
    assert len(logs) > 0
    log = logs[0]
    assert log.operation_type == GitOperationType.PUSH
    assert log.status == GitOperationStatus.SUCCESS
    assert "원격 저장소" in log.details

# Git 작업 로그 조회 
@patch("backend.api.v1.endpoints.git_unified.GitService", MockGitService)
@patch("backend.core.auth.has_permission", mock_has_permission)
def test_get_git_logs(client, admin_headers, mock_db_session):
    """Git 작업 로그 조회 테스트 (관리자 권한)"""
    # 몇 가지 테스트 로그 추가
    log1 = GitOperationLog(
        operation_type=GitOperationType.COMMIT,
        status=GitOperationStatus.SUCCESS,
        repository_path="/test/repo",
        message="테스트 커밋 1"
    )
    log2 = GitOperationLog(
        operation_type=GitOperationType.BRANCH_CREATE,
        status=GitOperationStatus.SUCCESS,
        repository_path="/test/repo",
        branch_name="feature/test"
    )
    mock_db_session.add(log1)
    mock_db_session.add(log2)
    mock_db_session.commit()
    
    # 로그 조회 요청
    response = client.get("/api/v1/git/logs", headers=admin_headers)
    
    # 응답 상태 확인
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "logs" in data["data"]
    assert len(data["data"]["logs"]) >= 2
    
    # 로그 필터링 테스트
    response = client.get(
        "/api/v1/git/logs?operation_type=commit", 
        headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data["data"]
    logs = data["data"]["logs"]
    assert len(logs) > 0
    assert all(log["operation_type"] == "commit" for log in logs)

# 접근 권한 테스트
def test_git_operation_permissions(client, user_headers, mock_db_session):
    """일반 사용자의 Git 쓰기 작업 접근 제한 테스트 (실제 권한 검사)"""
    # 커밋 요청 (권한 부족, 실제 권한 검사 사용)
    response = client.post(
        "/api/v1/git/commit",
        headers=user_headers,
        json={"message": "테스트 커밋"}
    )
    
    # 권한 부족으로 인한 접근 거부 확인
    assert response.status_code in [401, 403]  # 인증 실패 또는 권한 부족
    
    # 로그 조회 요청 (권한 부족, 실제 권한 검사 사용)
    response = client.get("/api/v1/git/logs", headers=user_headers)
    assert response.status_code in [401, 403]  # 인증 실패 또는 권한 부족