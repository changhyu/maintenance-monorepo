"""
GitTagService 클래스에 대한 단위 테스트
"""
import os
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime

from gitmanager.git.core.services.tag_service import GitTagService
from gitmanager.git.core.exceptions import GitCommandException, GitTagException
from gitmanager.git.core.types import GitTag


class TestGitTagService(unittest.TestCase):
    """GitTagService 클래스에 대한 테스트 케이스"""

    @patch('gitmanager.git.core.services.base_service.is_git_installed')
    @patch('gitmanager.git.core.services.base_service.get_unified_cache_manager')
    def setUp(self, mock_cache_manager, mock_is_git_installed):
        """테스트 셋업"""
        mock_is_git_installed.return_value = True
        self.mock_cache_manager = mock_cache_manager.return_value
        self.test_repo_path = '/tmp/test_repo'
        self.service = GitTagService(repo_path=self.test_repo_path)

    def test_init(self):
        """초기화 테스트"""
        self.assertEqual(self.service.repo_path, self.test_repo_path)
        self.assertFalse(self.service.bare)

    @patch.object(GitTagService, 'run_git_cmd')
    @patch.object(GitTagService, 'get_from_cache')
    @patch.object(GitTagService, 'set_to_cache')
    def test_get_tags(self, mock_set_cache, mock_get_cache, mock_run_git_command):
        """태그 목록 조회 테스트"""
        # 캐시 미스 시뮬레이션
        mock_get_cache.return_value = None
        
        # Git tag 명령에 대한 응답 모의 설정
        mock_run_git_command.return_value = """v1.0|abcd1234|태그 1 메시지|2023-05-20T10:00:00|작성자1
v2.0|efgh5678|태그 2 메시지|2023-05-21T11:00:00|작성자2"""

        # 태그 목록 조회
        tags = self.service.get_tags()

        # 결과 검증
        self.assertEqual(len(tags), 2)
        self.assertEqual(tags[0].name, "v1.0")
        self.assertEqual(tags[0].commit, "abcd1234")
        self.assertEqual(tags[0].message, "태그 1 메시지")
        self.assertEqual(tags[1].name, "v2.0")
        self.assertEqual(tags[1].commit, "efgh5678")
        
        # 호출 검증
        mock_run_git_command.assert_called_once()
        mock_set_cache.assert_called_once()

    @patch.object(GitTagService, 'run_git_cmd')
    @patch.object(GitTagService, 'get_from_cache')
    @patch.object(GitTagService, 'set_to_cache')
    def test_get_tags_from_cache(self, mock_set_cache, mock_get_cache, mock_run_git_command):
        """캐시에서 태그 목록 조회 테스트"""
        # 캐시 히트 시뮬레이션
        cached_tags = [
            GitTag(
                name="v1.0",
                commit="abcd1234",
                message="캐시된 태그 메시지",
                date=datetime.fromisoformat("2023-05-20T10:00:00"),
                tagger={"name": "캐시된 작성자"}
            )
        ]
        mock_get_cache.return_value = cached_tags
        
        # 태그 목록 조회
        tags = self.service.get_tags()

        # 결과 검증
        self.assertEqual(len(tags), 1)
        self.assertEqual(tags[0].name, "v1.0")
        self.assertEqual(tags[0].message, "캐시된 태그 메시지")
        
        # Git 명령이 실행되지 않았는지 확인
        mock_run_git_command.assert_not_called()
        mock_set_cache.assert_not_called()

    @patch.object(GitTagService, 'run_git_cmd')
    @patch.object(GitTagService, 'get_from_cache')
    @patch.object(GitTagService, 'set_to_cache')
    def test_get_tag(self, mock_set_cache, mock_get_cache, mock_run_git_command):
        """특정 태그 조회 테스트"""
        # 캐시 미스 시뮬레이션
        mock_get_cache.return_value = None
        
        # Git show 명령에 대한 응답 모의 설정
        mock_run_git_command.return_value = "abcd1234|작성자|태그 메시지|Sun May 21 11:00:00 2023 +0900"

        # 태그 조회
        tag = self.service.get_tag("v1.0")

        # 결과 검증
        self.assertIsNotNone(tag)
        self.assertEqual(tag.name, "v1.0")
        self.assertEqual(tag.commit, "abcd1234")
        self.assertEqual(tag.message, "태그 메시지")
        self.assertEqual(tag.tagger["name"], "작성자")
        
        # 호출 검증
        mock_run_git_command.assert_called_once()
        mock_set_cache.assert_called_once()

    @patch.object(GitTagService, 'run_git_cmd')
    @patch.object(GitTagService, 'get_tags')
    @patch.object(GitTagService, 'invalidate_cache_by_pattern')
    def test_create_tag(self, mock_invalidate_cache, mock_get_tags, mock_run_git_command):
        """태그 생성 테스트"""
        # 기존 태그 목록 시뮬레이션
        mock_get_tags.return_value = []
        
        # 태그 생성
        result = self.service.create_tag(
            name="v1.0",
            message="새 태그 메시지",
            commit="abcd1234"
        )

        # 결과 검증
        self.assertTrue(result)
        
        # 호출 검증
        mock_run_git_command.assert_called_once_with(
            ["tag", "-a", "-m", "새 태그 메시지", "v1.0", "abcd1234"]
        )
        mock_invalidate_cache.assert_called_once()

    @patch.object(GitTagService, 'run_git_cmd')
    @patch.object(GitTagService, 'get_tags')
    def test_create_tag_already_exists(self, mock_get_tags, mock_run_git_command):
        """이미 존재하는 태그 생성 시도 테스트"""
        # 기존 태그 목록 시뮬레이션
        mock_get_tags.return_value = [
            GitTag(name="v1.0", commit="abcd1234", message="기존 태그")
        ]
        
        # 태그 생성 시도
        result = self.service.create_tag(name="v1.0", message="새 태그")

        # 결과 검증
        self.assertFalse(result)
        
        # Git 명령이 실행되지 않았는지 확인
        mock_run_git_command.assert_not_called()

    @patch.object(GitTagService, 'run_git_cmd')
    @patch.object(GitTagService, 'get_tags')
    @patch.object(GitTagService, 'invalidate_cache_by_pattern')
    def test_delete_tag(self, mock_invalidate_cache, mock_get_tags, mock_run_git_command):
        """태그 삭제 테스트"""
        # 기존 태그 목록 시뮬레이션
        mock_get_tags.return_value = [
            GitTag(name="v1.0", commit="abcd1234", message="삭제할 태그")
        ]
        
        # 태그 삭제
        result = self.service.delete_tag("v1.0")

        # 결과 검증
        self.assertTrue(result)
        
        # 호출 검증
        mock_run_git_command.assert_called_once_with(["tag", "-d", "v1.0"])
        mock_invalidate_cache.assert_called_once()

    @patch.object(GitTagService, 'run_git_cmd')
    @patch.object(GitTagService, 'get_tags')
    def test_delete_tag_not_exists(self, mock_get_tags, mock_run_git_command):
        """존재하지 않는 태그 삭제 시도 테스트"""
        # 기존 태그 목록 시뮬레이션
        mock_get_tags.return_value = []
        
        # 태그 삭제 시도
        result = self.service.delete_tag("v1.0")

        # 결과 검증
        self.assertFalse(result)
        
        # Git 명령이 실행되지 않았는지 확인
        mock_run_git_command.assert_not_called()

    @patch.object(GitTagService, 'run_git_cmd')
    def test_push_tags(self, mock_run_git_command):
        """태그 푸시 테스트"""
        # 푸시 성공 시뮬레이션
        mock_run_git_command.return_value = "To https://github.com/user/repo.git\n * [new tag]         v1.0 -> v1.0"
        
        # 모든 태그 푸시
        result = self.service.push_tags()

        # 결과 검증
        self.assertTrue(result)
        
        # 호출 검증
        mock_run_git_command.assert_called_once_with(["push", "origin", "--tags"])
        
        # 특정 태그 푸시
        mock_run_git_command.reset_mock()
        mock_run_git_command.return_value = "To https://github.com/user/repo.git\n * [new tag]         v1.0 -> v1.0"
        
        result = self.service.push_tags(tag="v1.0")
        
        # 결과 검증
        self.assertTrue(result)
        
        # 호출 검증
        mock_run_git_command.assert_called_once_with(["push", "origin", "refs/tags/v1.0"])

    @patch.object(GitTagService, 'run_git_cmd')
    def test_push_tags_failure(self, mock_run_git_command):
        """태그 푸시 실패 테스트"""
        # 푸시 실패 시뮬레이션
        mock_run_git_command.side_effect = GitCommandException("error: failed to push some refs")
        
        # 태그 푸시 시도
        result = self.service.push_tags()

        # 결과 검증
        self.assertFalse(result) 