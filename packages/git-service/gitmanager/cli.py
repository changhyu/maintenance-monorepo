#!/usr/bin/env python
"""
Git 서비스 CLI 도구

이 모듈은 GitManager 패키지를 위한 명령줄 인터페이스를 제공합니다.
"""
import argparse
import json
import os
import sys
from typing import Dict, List, Optional, Any

# 임포트 경로 문제 해결을 위한 개선된 코드
try:
    # 패키지가 설치된 경우 직접 임포트
    from gitmanager import GitService, get_git_service
except ImportError:
    # 패키지가 설치되지 않은 경우 상대 경로 설정
    # sys.path 수정 대신 명확한 패키지 경로 사용
    package_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    if package_root not in sys.path:
        sys.path.insert(0, package_root)
    
    # 이제 gitmanager 패키지 임포트 시도
    try:
        from gitmanager import GitService, get_git_service
    except ImportError as e:
        print(f"gitmanager 패키지를 임포트할 수 없습니다: {e}", file=sys.stderr)
        print(f"현재 sys.path: {sys.path}", file=sys.stderr)
        sys.exit(1)

def get_version() -> str:
    """GitManager 버전을 반환합니다."""
    try:
        from importlib.metadata import version
        return version("gitmanager")
    except ImportError:
        try:
            from importlib_metadata import version
            return version("gitmanager")
        except (ImportError, Exception):
            return "0.3.0"  # 기본 버전

def format_output(data: Any, output_format: str = "json") -> str:
    """
    데이터를 지정된 형식으로 포맷팅합니다.
    
    Args:
        data: 포맷팅할 데이터
        output_format: 출력 형식 ("json" 또는 "text")
        
    Returns:
        포맷팅된 문자열
    """
    if output_format == "json":
        return json.dumps(data, indent=2, ensure_ascii=False)
    
    # 텍스트 형식 (기본)
    if isinstance(data, dict):
        return "\n".join([f"{k}: {v}" for k, v in data.items()])
    elif isinstance(data, list):
        return "\n".join([str(item) for item in data])
    else:
        return str(data)

def cmd_status(args: argparse.Namespace) -> int:
    """
    저장소 상태 명령을 처리합니다.
    
    Args:
        args: 명령줄 인자
        
    Returns:
        종료 코드
    """
    try:
        git_service = GitService(args.repo_path)
        status = git_service.get_status(use_cache=not args.no_cache)
        
        print(format_output(status, args.format))
        return 0
    except Exception as e:
        print(f"오류: {str(e)}", file=sys.stderr)
        return 1

def cmd_commits(args: argparse.Namespace) -> int:
    """
    커밋 이력 명령을 처리합니다.
    
    Args:
        args: 명령줄 인자
        
    Returns:
        종료 코드
    """
    try:
        git_service = GitService(args.repo_path)
        commits = git_service.get_commit_history(
            limit=args.limit, 
            skip=args.skip,
            path=args.path,
            use_cache=not args.no_cache
        )
        
        print(format_output(commits, args.format))
        return 0
    except Exception as e:
        print(f"오류: {str(e)}", file=sys.stderr)
        return 1

def cmd_branches(args: argparse.Namespace) -> int:
    """
    브랜치 목록 명령을 처리합니다.
    
    Args:
        args: 명령줄 인자
        
    Returns:
        종료 코드
    """
    try:
        git_service = GitService(args.repo_path)
        branches = git_service.get_branches(use_cache=not args.no_cache)
        
        print(format_output(branches, args.format))
        return 0
    except Exception as e:
        print(f"오류: {str(e)}", file=sys.stderr)
        return 1

def cmd_info(args: argparse.Namespace) -> int:
    """
    저장소 정보 명령을 처리합니다.
    
    Args:
        args: 명령줄 인자
        
    Returns:
        종료 코드
    """
    try:
        # 버전 정보 출력
        version_info = {
            "gitmanager_version": get_version(),
            "python_version": ".".join(map(str, sys.version_info[:3])),
            "git_available": True
        }
        
        try:
            import git
            version_info["git_python_version"] = git.__version__
        except ImportError:
            version_info["git_available"] = False
            version_info["git_python_version"] = "not installed"
        
        try:
            git_service = GitService(args.repo_path)
            repo_info = git_service.get_repository_info()
            version_info["repository"] = repo_info
        except Exception as e:
            version_info["repository_error"] = str(e)
        
        print(format_output(version_info, args.format))
        return 0
    except Exception as e:
        print(f"오류: {str(e)}", file=sys.stderr)
        return 1

def main() -> int:
    """
    CLI 메인 함수
    
    Returns:
        종료 코드
    """
    parser = argparse.ArgumentParser(
        description="GitManager 명령줄 도구"
    )
    
    parser.add_argument(
        "--version", "-v", 
        action="version", 
        version=f"GitManager {get_version()}"
    )
    
    parser.add_argument(
        "--repo-path", "-r",
        type=str,
        default=os.getcwd(),
        help="Git 저장소 경로 (기본값: 현재 디렉토리)"
    )
    
    parser.add_argument(
        "--format", "-f",
        choices=["json", "text"],
        default="text",
        help="출력 형식 (기본값: text)"
    )
    
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="캐싱 비활성화"
    )
    
    subparsers = parser.add_subparsers(
        title="명령",
        dest="command",
        help="사용 가능한 명령"
    )
    
    # 상태 명령
    status_parser = subparsers.add_parser(
        "status", 
        help="저장소 상태 조회"
    )
    
    # 커밋 명령
    commits_parser = subparsers.add_parser(
        "commits", 
        help="커밋 이력 조회"
    )
    commits_parser.add_argument(
        "--limit", "-l",
        type=int,
        default=10,
        help="조회할 최대 커밋 수 (기본값: 10)"
    )
    commits_parser.add_argument(
        "--skip", "-s",
        type=int,
        default=0,
        help="건너뛸 커밋 수 (기본값: 0)"
    )
    commits_parser.add_argument(
        "--path", "-p",
        type=str,
        help="특정 파일 또는 디렉토리 경로"
    )
    
    # 브랜치 명령
    branches_parser = subparsers.add_parser(
        "branches", 
        help="브랜치 목록 조회"
    )
    
    # 정보 명령
    info_parser = subparsers.add_parser(
        "info", 
        help="GitManager 및 저장소 정보 조회"
    )
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        return 0
    
    # 명령 처리
    command_handlers = {
        "status": cmd_status,
        "commits": cmd_commits,
        "branches": cmd_branches,
        "info": cmd_info
    }
    
    if args.command in command_handlers:
        return command_handlers[args.command](args)
    else:
        parser.print_help()
        return 0

if __name__ == "__main__":
    sys.exit(main()) 