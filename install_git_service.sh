#!/bin/bash

# Git 서비스 설치 및 테스트 스크립트
echo "Git 서비스 설치 및 테스트를 시작합니다..."

# 필수 패키지 설치
echo "필수 패키지 설치 중..."
pip install gitpython pytest

# Git 서버 모듈 디렉토리 확인
GIT_SERVER_DIR="packages/api/servers/src/git"
if [ -d "$GIT_SERVER_DIR" ]; then
  echo "✅ Git 서버 모듈 디렉토리 존재: $GIT_SERVER_DIR"
  
  # Git 서버 패키지 설치
  echo "Git 서버 패키지 설치 중..."
  cd "$GIT_SERVER_DIR" && pip install -e . || echo "Git 서버 패키지 설치에 실패했습니다."
  cd -
else
  echo "❌ Git 서버 모듈 디렉토리가 존재하지 않습니다: $GIT_SERVER_DIR"
fi

# Git 서비스 모듈 확인
GIT_SERVICE_FILE="packages/api/src/services/git_service.py"
if [ -f "$GIT_SERVICE_FILE" ]; then
  echo "✅ Git 서비스 모듈 존재: $GIT_SERVICE_FILE"
  
  # 심볼릭 링크 생성 (필요한 경우)
  mkdir -p "git/services"
  ln -sf "$(pwd)/$GIT_SERVICE_FILE" "git/services/git_service.py" 2>/dev/null || echo "심볼릭 링크 생성에 실패했습니다."
else
  echo "❌ Git 서비스 모듈이 존재하지 않습니다: $GIT_SERVICE_FILE"
fi

# 테스트 디렉토리 생성
mkdir -p "git/tests"

# 간단한 테스트 파일 작성
cat > "git/tests/test_git_service.py" << 'EOL'
"""
Git 서비스 테스트
"""
import os
import sys
import tempfile
import unittest
from pathlib import Path
import subprocess

# 프로젝트 루트 경로 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from packages.api.src.services.git_service import GitService

class GitServiceTest(unittest.TestCase):
    """Git 서비스 테스트 클래스"""
    
    def setUp(self):
        """테스트 설정"""
        # 임시 디렉토리 생성
        self.temp_dir = tempfile.TemporaryDirectory()
        self.repo_path = self.temp_dir.name
        
        # 테스트용 Git 저장소 초기화
        subprocess.run(["git", "init", self.repo_path], check=True, capture_output=True)
        
        # 테스트용 파일 생성
        test_file = Path(self.repo_path) / "test.txt"
        test_file.write_text("테스트 내용")
        
        # 사용자 정보 설정
        subprocess.run(["git", "-C", self.repo_path, "config", "user.name", "Test User"], check=True)
        subprocess.run(["git", "-C", self.repo_path, "config", "user.email", "test@example.com"], check=True)
        
        # 첫 번째 커밋 생성
        subprocess.run(["git", "-C", self.repo_path, "add", "."], check=True, capture_output=True)
        subprocess.run(["git", "-C", self.repo_path, "commit", "-m", "Initial commit"], check=True, capture_output=True)
        
        # Git 서비스 인스턴스 생성
        self.git_service = GitService(repo_path=self.repo_path)
    
    def tearDown(self):
        """정리"""
        self.temp_dir.cleanup()
    
    def test_get_status(self):
        """저장소 상태 확인 테스트"""
        status = self.git_service.get_status()
        
        self.assertIsNotNone(status)
        self.assertIn("branch", status)
        self.assertIn("modified_files", status)
        self.assertIn("has_changes", status)
        self.assertIn("last_commit", status)
        
        # 브랜치명 확인
        self.assertEqual(status["branch"], "main")
        
        # 변경사항 없음 확인
        self.assertEqual(status["modified_files"], 0)
        self.assertFalse(status["has_changes"])
    
    def test_create_commit(self):
        """커밋 생성 테스트"""
        # 변경사항 생성
        test_file = Path(self.repo_path) / "test.txt"
        test_file.write_text("변경된 내용")
        
        # 커밋 생성
        commit_result = self.git_service.create_commit("테스트 커밋")
        
        self.assertIsNotNone(commit_result)
        self.assertIn("success", commit_result)
        self.assertTrue(commit_result["success"])
        self.assertIn("commit", commit_result)
        self.assertIn("message", commit_result)
        
        # 커밋 메시지 확인
        self.assertEqual(commit_result["message"], "테스트 커밋")
        
        # 상태 변경 확인
        status = self.git_service.get_status()
        self.assertEqual(status["modified_files"], 0)
        self.assertFalse(status["has_changes"])

if __name__ == "__main__":
    unittest.main()
EOL

echo "테스트 실행 중..."
cd git/tests
PYTHONPATH=../.. python test_git_service.py

echo "Git 서비스 설치 및 테스트가 완료되었습니다." 