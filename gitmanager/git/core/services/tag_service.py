"""
Git 태그 서비스 모듈

이 모듈은 Git 태그 관련 작업을 관리하는 서비스 클래스를 제공합니다.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union

from gitmanager.git.core.services.base_service import GitServiceBase, DEFAULT_TTL_SETTINGS
from gitmanager.git.core.exceptions import (
    GitTagException,
    GitCommandException,
)
from gitmanager.git.core.types import (
    GitTag,
    TagInfo,
)

class GitTagService(GitServiceBase):
    """
    Git 태그 관련 서비스 클래스
    """
    
    def get_tags(self, use_cache: bool = True) -> List[GitTag]:
        """
        태그 목록을 조회합니다.
        
        Args:
            use_cache: 캐시 사용 여부
            
        Returns:
            List[GitTag]: 태그 목록
        """
        # 캐시 키 생성
        cache_key = self._get_cache_key("tags")
        
        # 캐시 확인
        if use_cache:
            hit, cached_value = self._get_cache(cache_key)
            if hit:
                return cached_value
        
        try:
            # 태그 목록 조회
            cmd = ["tag", "-l", "--format=%(refname:short)|%(objectname)|%(subject)|%(taggerdate:iso)|%(taggername)"]
            output = self._run_git_command(cmd)
            
            # 결과 파싱
            tags = []
            for line in output.strip().split('\n'):
                if not line.strip():
                    continue
                
                parts = line.strip().split('|')
                if len(parts) >= 3:
                    # 태그 정보 추출
                    name = parts[0]
                    commit = parts[1]
                    message = parts[2]
                    
                    # 날짜 및 작성자 정보
                    date = None
                    tagger = None
                    
                    if len(parts) >= 4 and parts[3]:
                        try:
                            date = datetime.fromisoformat(parts[3].strip())
                        except (ValueError, TypeError):
                            date = None
                            
                    if len(parts) >= 5 and parts[4]:
                        tagger = {"name": parts[4].strip()}
                        
                    # GitTag 객체 생성
                    tag = GitTag(
                        name=name,
                        commit=commit,
                        message=message,
                        date=date,
                        tagger=tagger
                    )
                    
                    tags.append(tag)
            
            # 캐시에 저장
            if use_cache:
                self._set_cache(cache_key, tags, ttl=DEFAULT_TTL_SETTINGS["tags"])
                
            return tags
            
        except Exception as e:
            self.logger.error(f"태그 목록 조회 중 오류: {str(e)}")
            return []
    
    def get_tag(self, name: str) -> Optional[GitTag]:
        """
        특정 태그의 정보를 조회합니다.
        
        Args:
            name: 태그 이름
            
        Returns:
            Optional[GitTag]: 태그 정보
        """
        try:
            # 캐시 키 생성
            cache_key = self._get_cache_key("tag", name=name)
            
            # 캐시 확인
            hit, cached_value = self._get_cache(cache_key)
            if hit:
                return cached_value
            
            # 태그 정보 조회
            cmd = ["show", "-s", "--format=%H|%an|%s|%cd", f"refs/tags/{name}"]
            output = self._run_git_command(cmd)
            
            # 결과 파싱
            parts = output.strip().split('|')
            if len(parts) >= 3:
                # 태그 정보 추출
                commit = parts[0]
                tagger_name = parts[1]
                message = parts[2]
                
                # 날짜 정보
                date = None
                if len(parts) >= 4:
                    try:
                        date = datetime.strptime(parts[3].strip(), "%a %b %d %H:%M:%S %Y %z")
                    except (ValueError, TypeError):
                        date = None
                
                # GitTag 객체 생성
                tag = GitTag(
                    name=name,
                    commit=commit,
                    message=message,
                    date=date,
                    tagger={"name": tagger_name} if tagger_name else None
                )
                
                # 캐시에 저장
                self._set_cache(cache_key, tag, ttl=DEFAULT_TTL_SETTINGS["tags"])
                
                return tag
            
            return None
            
        except Exception as e:
            self.logger.error(f"태그 정보 조회 중 오류: {str(e)}")
            return None
    
    def create_tag(self, name: str, message: Optional[str] = None, commit: str = "HEAD") -> bool:
        """
        새로운 태그를 생성합니다.
        
        Args:
            name: 태그 이름
            message: 태그 메시지
            commit: 태그를 생성할 커밋 (기본값: HEAD)
            
        Returns:
            bool: 성공 여부
        """
        try:
            # 입력 값 검증
            if not name or not name.strip():
                raise GitTagException("태그 이름은 비어있을 수 없습니다.")
                
            # 이미 존재하는지 확인
            tags = self.get_tags(use_cache=False)
            for tag in tags:
                if tag.name == name:
                    raise GitTagException(f"이미 '{name}' 이름의 태그가 존재합니다.")
            
            # 태그 생성 명령어 구성
            cmd = ["tag"]
            
            # 주석이 있는 태그 (annotated tag)
            if message:
                cmd.extend(["-a", "-m", message])
                
            # 태그 이름 및 커밋 추가
            cmd.append(name)
            cmd.append(commit)
            
            # 명령어 실행
            self._run_git_command(cmd)
            
            # 캐시 무효화
            self.invalidate_cache_by_pattern(f"{self._repo_id}:tags")
            
            return True
            
        except Exception as e:
            self.logger.error(f"태그 생성 중 오류: {str(e)}")
            return False
    
    def delete_tag(self, name: str) -> bool:
        """
        태그를 삭제합니다.
        
        Args:
            name: 태그 이름
            
        Returns:
            bool: 성공 여부
        """
        try:
            # 존재하는지 확인
            tags = self.get_tags()
            tag_names = [t.name for t in tags]
            
            if name not in tag_names:
                raise GitTagException(f"'{name}' 이름의 태그가 존재하지 않습니다.")
            
            # 태그 삭제
            cmd = ["tag", "-d", name]
            self._run_git_command(cmd)
            
            # 캐시 무효화
            self.invalidate_cache_by_pattern(f"{self._repo_id}:tags")
            
            return True
            
        except Exception as e:
            self.logger.error(f"태그 삭제 중 오류: {str(e)}")
            return False
    
    def push_tags(self, remote: str = "origin", tag: Optional[str] = None) -> bool:
        """
        태그를 원격 저장소에 푸시합니다.
        
        Args:
            remote: 원격 저장소 이름
            tag: 푸시할 태그 이름 (없으면 모든 태그)
            
        Returns:
            bool: 성공 여부
        """
        try:
            # 태그 푸시 명령어 구성
            cmd = ["push", remote]
            
            # 특정 태그 또는 모든 태그
            if tag:
                cmd.append(f"refs/tags/{tag}")
            else:
                cmd.append("--tags")
                
            # 명령어 실행
            self._run_git_command(cmd)
            
            return True
            
        except Exception as e:
            self.logger.error(f"태그 푸시 중 오류: {str(e)}")
            return False 