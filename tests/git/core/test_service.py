"""
GitService 클래스에 대한 테스트

이 모듈은 GitService 클래스와 새로 추가된 객체 반환 메서드들의 기능을 테스트합니다.
"""
import unittest
from unittest.mock import patch, MagicMock

from gitmanager.git.core.service import GitService
from gitmanager.git.core.types import GitBranch, GitRemote, GitTag, GitConfig

class TestGitService(unittest.TestCase):
    """GitService 클래스에 대한 테스트 케이스"""
    
    @patch('gitmanager.git.core.service.is_git_installed')
    def setUp(self, mock_is_git_installed):
        """테스트 셋업"""
        mock_is_git_installed.return_value = True
        self.test_repo_path = '/tmp/test_repo'
        self.service = GitService(repository_path=self.test_repo_path)
        
        # 서비스 모듈에 대한 mock 설정
        self.service._branch_service = MagicMock()
        self.service._remote_service = MagicMock()
        self.service._tag_service = MagicMock()
        self.service._config_service = MagicMock()
    
    def test_get_branch_objects(self):
        """get_branch_objects 메서드 테스트"""
        # 목 설정
        mock_branches = [
            GitBranch(name='main', is_current=True, is_remote=False, tracking='origin/main'),
            GitBranch(name='develop', is_current=False, is_remote=False)
        ]
        self.service._branch_service.get_branches.return_value = mock_branches
        
        # 메서드 호출
        branches = self.service.get_branch_objects()
        
        # 결과 검증
        self.assertEqual(len(branches), 2)
        self.assertIs(branches, mock_branches)  # 동일한 객체 참조 확인
        
        # 필수 속성 확인
        self.assertEqual(branches[0].name, 'main')
        self.assertTrue(branches[0].is_current)
        self.assertEqual(branches[1].name, 'develop')
        
        # 브랜치 서비스 호출 확인
        self.service._branch_service.get_branches.assert_called_once()
    
    def test_get_remote_objects(self):
        """get_remote_objects 메서드 테스트"""
        # 목 설정
        mock_remotes = [
            GitRemote(name='origin', url='https://github.com/user/test-repo.git', fetch_url='https://github.com/user/test-repo.git'),
            GitRemote(name='upstream', url='https://github.com/upstream/test-repo.git', fetch_url='https://github.com/upstream/test-repo.git')
        ]
        self.service._remote_service.get_remotes.return_value = mock_remotes
        
        # 메서드 호출
        remotes = self.service.get_remote_objects()
        
        # 결과 검증
        self.assertEqual(len(remotes), 2)
        self.assertIs(remotes, mock_remotes)  # 동일한 객체 참조 확인
        
        # 필수 속성 확인
        self.assertEqual(remotes[0].name, 'origin')
        self.assertEqual(remotes[0].url, 'https://github.com/user/test-repo.git')
        self.assertEqual(remotes[1].name, 'upstream')
        
        # 원격 저장소 서비스 호출 확인
        self.service._remote_service.get_remotes.assert_called_once()
    
    def test_get_tag_objects(self):
        """get_tag_objects 메서드 테스트"""
        # 목 설정
        mock_tags = [
            GitTag(name='v1.0.0', commit='abcd123', message='Version 1.0.0'),
            GitTag(name='v1.1.0', commit='efgh456', message='Version 1.1.0')
        ]
        self.service._tag_service.get_tags.return_value = mock_tags
        
        # 메서드 호출
        tags = self.service.get_tag_objects()
        
        # 결과 검증
        self.assertEqual(len(tags), 2)
        self.assertIs(tags, mock_tags)  # 동일한 객체 참조 확인
        
        # 필수 속성 확인
        self.assertEqual(tags[0].name, 'v1.0.0')
        self.assertEqual(tags[0].commit, 'abcd123')
        self.assertEqual(tags[1].name, 'v1.1.0')
        
        # 태그 서비스 호출 확인
        self.service._tag_service.get_tags.assert_called_once()
    
    def test_get_config_object(self):
        """get_config_object 메서드 테스트"""
        # 목 설정
        mock_config = GitConfig(
            user={"name": "Test User", "email": "test@example.com"},
            core={"editor": "vim"}
        )
        self.service._config_service.get_config.return_value = mock_config
        
        # 메서드 호출
        config = self.service.get_config_object()
        
        # 결과 검증
        self.assertIs(config, mock_config)  # 동일한 객체 참조 확인
        
        # 필수 속성 확인 (GitConfig 클래스의 구현에 따라 달라질 수 있음)
        self.assertEqual(config.user["name"], "Test User")
        self.assertEqual(config.core["editor"], "vim")
        
        # 설정 서비스 호출 확인
        self.service._config_service.get_config.assert_called_once()
    
    def test_api_compatibility(self):
        """기존 API와 새로운 API의 호환성 테스트"""
        # 브랜치 테스트 설정
        mock_branches = [
            GitBranch(name='main', is_current=True, is_remote=False, tracking='origin/main'),
            GitBranch(name='develop', is_current=False, is_remote=False)
        ]
        self.service._branch_service.get_branches.return_value = mock_branches
        
        # 기존 API 호출
        dict_branches = self.service.get_branches()
        # 새 API 호출
        obj_branches = self.service.get_branch_objects()
        
        # 결과 검증
        self.assertEqual(len(dict_branches), len(obj_branches))
        for i, branch_obj in enumerate(obj_branches):
            # 객체의 dict() 변환 결과와 기존 API 반환 딕셔너리 비교
            branch_dict = branch_obj.dict() if hasattr(branch_obj, 'dict') else None
            if branch_dict:
                self.assertEqual(branch_dict["name"], dict_branches[i]["name"])
        
        # 원격 저장소 호출은 두 번 됐는지 확인 (get_branches, get_branch_objects)
        self.assertEqual(self.service._branch_service.get_branches.call_count, 2)

if __name__ == '__main__':
    unittest.main()