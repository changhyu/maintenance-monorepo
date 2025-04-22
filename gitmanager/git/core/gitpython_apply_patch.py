"""
GitPython 패치 적용 모듈

이 모듈은 GitPython 라이브러리의 Python 3.12 호환성 문제를 해결하기 위한 패치를 적용합니다.
다음 이슈를 해결합니다:
1. collections.Sequence -> collections.abc.Sequence 교체
2. universal_newlines -> text 교체 
3. Repo 클래스의 __del__ 메서드 개선
"""

import importlib
import importlib.util
import logging
import os
import re
import sys
import warnings
from pathlib import Path
from typing import Any, Dict, Optional, Union

# 로깅 설정
logger = logging.getLogger(__name__)


def apply_gitpython_patches() -> bool:
    """
    GitPython 패치 적용

    Returns:
        bool: 패치 적용 성공 여부
    """
    logger.info("GitPython 패치 적용 시작")
    success = True

    # Python 버전 확인
    py_version = sys.version_info
    logger.info(f"현재 Python 버전: {py_version.major}.{py_version.minor}.{py_version.micro}")

    # GitPython 설치 확인
    try:
        import git
        gitpython_version = git.__version__
        gitpython_path = git.__path__[0]
        logger.info(f"GitPython 버전: {gitpython_version}, 경로: {gitpython_path}")
    except ImportError:
        logger.error("GitPython이 설치되어 있지 않습니다.")
        return False

    # Repo 모듈 패치
    if py_version >= (3, 10):
        try:
            # git.repo.base 모듈 패치
            repo_base_module = find_module_path("git.repo.base")
            if repo_base_module:
                logger.info(f"Repo 모듈 경로: {repo_base_module}")
                patched = patch_repo_module(repo_base_module)
                success = success and patched
            else:
                logger.warning("git.repo.base 모듈을 찾을 수 없습니다.")
                success = False
        except Exception as e:
            logger.error(f"Repo 모듈 패치 중 오류 발생: {str(e)}")
            success = False

    # CMD 모듈 패치 (universal_newlines -> text)
    try:
        # git.cmd 모듈 패치
        cmd_module = find_module_path("git.cmd")
        if cmd_module:
            logger.info(f"CMD 모듈 경로: {cmd_module}")
            patched = patch_cmd_module(cmd_module)
            success = success and patched
        else:
            logger.warning("git.cmd 모듈을 찾을 수 없습니다.")
            success = False
    except Exception as e:
        logger.error(f"CMD 모듈 패치 중 오류 발생: {str(e)}")
        success = False

    # Git 모듈 __init__.py 패치 (경고 필터링)
    try:
        # git.__init__ 모듈 패치
        init_module = find_module_path("git.__init__")
        if init_module:
            logger.info(f"Init 모듈 경로: {init_module}")
            patched = patch_init_module(init_module)
            success = success and patched
        else:
            logger.warning("git.__init__ 모듈을 찾을 수 없습니다.")
            success = False
    except Exception as e:
        logger.error(f"Init 모듈 패치 중 오류 발생: {str(e)}")
        success = False

    if success:
        logger.info("모든 GitPython 패치가 성공적으로 적용되었습니다.")
    else:
        logger.warning("일부 GitPython 패치를 적용하지 못했습니다.")

    return success


def find_module_path(module_name: str) -> Optional[str]:
    """
    모듈 파일 경로 찾기

    Args:
        module_name: 모듈 이름

    Returns:
        Optional[str]: 모듈 파일 경로 또는 None
    """
    try:
        if "." in module_name:
            parent_module, child_module = module_name.rsplit(".", 1)
            parent = importlib.import_module(parent_module)
            module_path = os.path.join(os.path.dirname(parent.__file__), f"{child_module}.py")
        else:
            module = importlib.import_module(module_name)
            module_path = module.__file__
        
        if os.path.exists(module_path):
            return module_path
        return None
    except (ImportError, AttributeError) as e:
        logger.warning(f"모듈 경로를 찾을 수 없음 ({module_name}): {str(e)}")
        return None


def patch_repo_module(module_path: str) -> bool:
    """
    git.repo.base 모듈 패치 적용

    Args:
        module_path: 모듈 파일 경로

    Returns:
        bool: 패치 적용 성공 여부
    """
    logger.info(f"Repo 모듈 패치 적용 중: {module_path}")
    backup_path = create_backup_file(module_path)
    
    try:
        with open(module_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # collections.Sequence -> collections.abc.Sequence 변경
        if "collections.Sequence" in content:
            content = content.replace("collections.Sequence", "collections.abc.Sequence")
            logger.info("collections.Sequence -> collections.abc.Sequence 패치 적용")
        
        # __del__ 메서드 개선
        if "__del__" in content:
            # 기존 del 메서드 패턴
            del_pattern = r"def __del__\(self\):\s+self\.git\.clear_cache\(\)"
            
            # 개선된 del 메서드
            new_del_method = (
                "def __del__(self):\n"
                "        try:\n"
                "            if hasattr(self, 'git') and self.git:\n"
                "                self.git.clear_cache()\n"
                "        except (ImportError, AttributeError, TypeError):\n"
                "            pass"
            )
            
            if re.search(del_pattern, content):
                content = re.sub(del_pattern, new_del_method, content)
                logger.info("__del__ 메서드 패치 적용")
        
        # 수정된 내용 쓰기
        with open(module_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        logger.info(f"Repo 모듈 패치 완료: {module_path}")
        return True
    except Exception as e:
        logger.error(f"Repo 모듈 패치 실패: {str(e)}")
        try:
            # 실패 시 백업 복원
            if os.path.exists(backup_path):
                os.replace(backup_path, module_path)
                logger.info(f"백업에서 복원됨: {module_path}")
        except Exception as restore_error:
            logger.error(f"백업 복원 실패: {str(restore_error)}")
        return False


def patch_cmd_module(module_path: str) -> bool:
    """
    git.cmd 모듈 패치 적용 (universal_newlines -> text)

    Args:
        module_path: 모듈 파일 경로

    Returns:
        bool: 패치 적용 성공 여부
    """
    logger.info(f"CMD 모듈 패치 적용 중: {module_path}")
    backup_path = create_backup_file(module_path)
    
    try:
        with open(module_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # universal_newlines=True -> text=True 교체
        if "universal_newlines=True" in content:
            content = content.replace("universal_newlines=True", "text=True")
            logger.info("universal_newlines=True -> text=True 패치 적용")
        
        # Popen 호출 패턴 변경
        universal_newlines_pattern = r"universal_newlines\s*=\s*True"
        if re.search(universal_newlines_pattern, content):
            content = re.sub(universal_newlines_pattern, "text=True", content)
            logger.info("universal_newlines 패턴 -> text=True 패치 적용")
        
        # 수정된 내용 쓰기
        with open(module_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        logger.info(f"CMD 모듈 패치 완료: {module_path}")
        return True
    except Exception as e:
        logger.error(f"CMD 모듈 패치 실패: {str(e)}")
        try:
            # 실패 시 백업 복원
            if os.path.exists(backup_path):
                os.replace(backup_path, module_path)
                logger.info(f"백업에서 복원됨: {module_path}")
        except Exception as restore_error:
            logger.error(f"백업 복원 실패: {str(restore_error)}")
        return False


def patch_init_module(module_path: str) -> bool:
    """
    git.__init__ 모듈 패치 적용 (경고 필터링 추가)

    Args:
        module_path: 모듈 파일 경로

    Returns:
        bool: 패치 적용 성공 여부
    """
    logger.info(f"Init 모듈 패치 적용 중: {module_path}")
    backup_path = create_backup_file(module_path)
    
    try:
        with open(module_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # 경고 필터링 코드 추가
        warning_filter_code = """
# Python 버전 검사 및 경고 필터링
import sys
if sys.version_info >= (3, 10):
    import warnings
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="git")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="gitdb")
    warnings.filterwarnings("ignore", category=DeprecationWarning, module="smmap")
"""
        
        # 이미 경고 필터링 코드가 있는지 확인
        if "warnings.filterwarnings" not in content:
            # 적합한 위치 찾기 (일반적으로 import 섹션 다음)
            import_end_match = re.search(r"import.*?\n\n", content, re.DOTALL)
            if import_end_match:
                pos = import_end_match.end()
                content = content[:pos] + warning_filter_code + content[pos:]
                logger.info("경고 필터링 코드 추가됨")
            else:
                # 첫 번째 줄 주석 건너뛰기
                comment_end = content.find("\n\n")
                if comment_end > 0:
                    content = content[:comment_end+2] + warning_filter_code + content[comment_end+2:]
                    logger.info("경고 필터링 코드 추가됨")
                else:
                    # 적합한 위치를 찾지 못한 경우, 파일 상단에 추가
                    content = warning_filter_code + content
                    logger.info("경고 필터링 코드가 파일 상단에 추가됨")
        
        # 수정된 내용 쓰기
        with open(module_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        logger.info(f"Init 모듈 패치 완료: {module_path}")
        return True
    except Exception as e:
        logger.error(f"Init 모듈 패치 실패: {str(e)}")
        try:
            # 실패 시 백업 복원
            if os.path.exists(backup_path):
                os.replace(backup_path, module_path)
                logger.info(f"백업에서 복원됨: {module_path}")
        except Exception as restore_error:
            logger.error(f"백업 복원 실패: {str(restore_error)}")
        return False


def create_backup_file(file_path: str) -> str:
    """
    원본 파일의 백업 생성

    Args:
        file_path: 백업할 파일 경로

    Returns:
        str: 백업 파일 경로
    """
    from datetime import datetime
    
    backup_path = f"{file_path}.bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    try:
        import shutil
        shutil.copy2(file_path, backup_path)
        logger.info(f"백업 파일 생성: {backup_path}")
        return backup_path
    except Exception as e:
        logger.error(f"백업 파일 생성 실패: {str(e)}")
        return ""


def main():
    """메인 함수"""
    # 로깅 설정
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    
    logger.info("GitPython 패치 유틸리티 시작")
    
    success = apply_gitpython_patches()
    
    if success:
        logger.info("모든 패치가 성공적으로 적용되었습니다.")
        return 0
    else:
        logger.error("일부 패치를 적용하지 못했습니다.")
        return 1


if __name__ == "__main__":
    sys.exit(main()) 