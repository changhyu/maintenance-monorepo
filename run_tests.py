#!/usr/bin/env python
"""
통합 테스트 실행 스크립트 - 모든 종류의 테스트를 실행할 수 있는 유연한 테스트 러너
Python 3.8+ 및 3.12 호환성을 모두 지원합니다.
"""
import argparse
import json
import os
import platform
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

# Python 버전 확인
PY_VERSION = sys.version_info
PY_VERSION_STR = f"{PY_VERSION.major}.{PY_VERSION.minor}.{PY_VERSION.micro}"
IS_PY312_PLUS = PY_VERSION >= (3, 12)
IS_PY38_PLUS = PY_VERSION >= (3, 8)


def run_command(cmd, description="명령 실행", env=None):
    """
    명령어 실행 및 결과 반환
    """
    print(f"\n===== {description} =====")
    print(f"$ {' '.join(cmd)}")
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            env=env,
        )
        # 실시간으로 출력 표시
        output_lines = []
        for line in process.stdout:
            sys.stdout.write(line)
            output_lines.append(line)
        # 프로세스 종료 대기 및 결과 확인
        exit_code = process.wait()
        return exit_code, "".join(output_lines)
    except Exception as e:
        print(f"명령 실행 중 오류 발생: {e}")
        return 1, str(e)


def setup_environment():
    """
    테스트 환경 설정
    """
    # 시스템 정보 출력
    print(f"운영체제: {platform.system()} {platform.release()} ({platform.version()})")
    print(f"Python 버전: {PY_VERSION_STR}")
    print(f"Python 경로: {sys.executable}")

    # 프로젝트 루트 디렉토리 확인
    project_root = Path(__file__).parent
    os.chdir(project_root)
    # 환경 변수 설정
    env = os.environ.copy()

    # 명시적인 PYTHONPATH 설정 - 루트 디렉토리 및 하위 디렉토리 우선
    pythonpath = [
        project_root,
        os.path.join(project_root, "gitmanager"),
        os.path.join(project_root, "git_tests"),
    ]
    existing_pythonpath = env.get("PYTHONPATH", "")
    if existing_pythonpath:
        pythonpath.append(existing_pythonpath)

    env["PYTHONPATH"] = os.pathsep.join(pythonpath)

    # 필요한 패키지 설치 확인
    packages_to_check = ["GitPython", "pytest", "pytest-cov", "psutil"]
    missing_packages = []

    try:
        import pkg_resources

        for package in packages_to_check:
            try:
                pkg_resources.get_distribution(package)
                print(f"√ {package} 설치됨")
            except pkg_resources.DistributionNotFound:
                missing_packages.append(package)
                print(f"✗ {package} 설치되지 않음")
    except ImportError:
        # pkg_resources 없는 경우 수동 검사
        try:
            import git

            print(f"√ GitPython 설치됨")
        except ImportError:
            missing_packages.append("GitPython")
            print(f"✗ GitPython 설치되지 않음")

        try:
            import pytest

            print(f"√ pytest 설치됨")
        except ImportError:
            missing_packages.append("pytest")
            print(f"✗ pytest 설치되지 않음")

    # 누락된 패키지 설치
    if missing_packages:
        print("\n필요한 패키지를 설치합니다...")
        cmd = [sys.executable, "-m", "pip", "install"] + missing_packages
        run_command(cmd, "필요한 패키지 설치")

    # GitPython을 확인하고 모듈 별칭 설정
    try:
        import git as gitpython

        # 버전 정보 출력 (pkg_resources 사용하지 않음)
        try:
            if hasattr(gitpython, "__version__"):
                print(f"GitPython 버전: {gitpython.__version__}")
            else:
                print("GitPython 설치됨 (버전 정보 없음)")
        except Exception as e:
            print(f"버전 확인 중 오류: {e}")

        print(f"GitPython 경로: {gitpython.__file__}")
        print(f"GitPython 디렉토리: {os.path.dirname(gitpython.__file__)}/")

        # Repo 클래스 임포트 테스트
        try:
            from git import Repo

            print("Repo 클래스 import 성공!")
        except ImportError as e:
            print(f"경고: GitPython Repo 클래스를 가져오는 데 실패했습니다: {str(e)}")

        print("GitPython 라이브러리 경로 설정 완료")
    except ImportError:
        print(
            "경고: GitPython 라이브러리를 찾을 수 없습니다. pip install gitpython으로 설치하세요."
        )

    # 테스트 데이터베이스 URL 설정
    env["DATABASE_URL"] = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/maintenance_test"
    )
    env["TESTING"] = "true"
    return project_root, env


def run_git_tests(env, verbose=False, specific_test=None, junit=False):
    """
    Git 관련 테스트 실행
    """
    print("\n\n===== Git 테스트 실행 =====")
    test_paths = []
    if specific_test:
        test_paths.append(specific_test)
    else:
        # GitManager 관련 테스트 경로 우선 확인
        gitmanager_test_locations = [
            "gitmanager/git/tests",
            "gitmanager/services/tests",
        ]
        for location in gitmanager_test_locations:
            if os.path.exists(location):
                test_paths.append(location)

        # 기존 Git 관련 테스트 경로 확인
        git_test_locations = ["git/tests", "git_tests", "gitservice/tests"]
        for location in git_test_locations:
            if location not in test_paths and os.path.exists(location):
                test_paths.append(location)

    if not test_paths:
        print("❌ Git 테스트 파일/디렉토리를 찾을 수 없습니다.")
        return 1, "Git 테스트 파일/디렉토리를 찾을 수 없습니다."

    success = True
    all_output = []

    for test_path in test_paths:
        # pytest 명령 구성
        cmd = [sys.executable, "-m", "pytest", test_path]
        if verbose:
            cmd.append("-v")

        # JUnit 보고서 설정
        if junit:
            report_path = (
                f"junit_report_{os.path.basename(test_path).replace('/', '_')}.xml"
            )
            cmd.extend(["--junitxml", report_path])

        # Python 3.12에서는 deprecation 경고 무시
        if IS_PY312_PLUS:
            cmd.append("-W ignore::DeprecationWarning")

        # 테스트 실행 속도 개선을 위한 xdist 플러그인 사용 시도
        try:
            # 프로세서 코어 수에 따라 적절한 병렬 처리 설정
            import multiprocessing

            import pytest_xdist

            cores = max(
                2, multiprocessing.cpu_count() - 1
            )  # 하나의 코어는 시스템용으로 남김
            cmd.extend(["-n", str(cores)])
            print(f"병렬 테스트 활성화: {cores}개 프로세스 사용")
        except ImportError:
            pass  # xdist 사용 불가능한 경우 직렬 실행

        print(f"\n실행: {' '.join(cmd)}")
        return_code, output = run_command(cmd, f"{test_path} 테스트 실행", env)
        all_output.append(f"--- {test_path} 테스트 결과 ---\n{output}")

        if return_code != 0:
            success = False
            print(f"❌ {test_path} 테스트 실패 (종료 코드: {return_code})")
        else:
            print(f"✅ {test_path} 테스트 성공")

    return 0 if success else 1, "\n".join(all_output)


def run_gitmanager_tests(env, verbose=False, junit=False):
    """
    GitManager 모듈 전용 테스트 실행
    """
    print("\n\n===== GitManager 모듈 테스트 실행 =====")
    gitmanager_paths = ["gitmanager"]

    if not os.path.exists(gitmanager_paths[0]):
        print("❓ GitManager 모듈을 찾을 수 없습니다.")
        return 0, "GitManager 모듈을 찾을 수 없습니다."

    cmd = [sys.executable, "-m", "pytest", gitmanager_paths[0]]
    if verbose:
        cmd.append("-v")
    if junit:
        cmd.extend(["--junitxml", "junit_gitmanager_report.xml"])

    print(f"\n실행: {' '.join(cmd)}")
    return_code, output = run_command(cmd, "GitManager 모듈 테스트 실행", env)

    if return_code != 0:
        print(f"❌ GitManager 테스트 실패 (종료 코드: {return_code})")
    else:
        print(f"✅ GitManager 테스트 성공")

    return return_code, output


def run_backup_tests(env, verbose=False, junit=False):
    """
    백업 관련 테스트 실행
    """
    print("\n\n===== 백업 테스트 실행 =====")
    backup_test_files = [
        "test_backup_service.py",
        "tests/unit/backup/test_backup_service.py",
    ]
    success = True
    tests_found = False
    all_output = []

    for test_file in backup_test_files:
        if os.path.exists(test_file):
            tests_found = True
            cmd = [sys.executable, "-m", "pytest", test_file]
            if verbose:
                cmd.append("-v")
            if junit:
                report_name = os.path.basename(test_file).replace(".py", "")
                cmd.extend(["--junitxml", f"junit_{report_name}_report.xml"])

            print(f"\n실행: {' '.join(cmd)}")
            return_code, output = run_command(cmd, f"{test_file} 테스트 실행", env)
            all_output.append(f"--- {test_file} 테스트 결과 ---\n{output}")

            if return_code != 0:
                success = False
                print(f"❌ {test_file} 테스트 실패 (종료 코드: {return_code})")
            else:
                print(f"✅ {test_file} 테스트 성공")

    if not tests_found:
        print("❌ 백업 테스트 파일을 찾을 수 없습니다.")
        return 1, "백업 테스트 파일을 찾을 수 없습니다."

    return 0 if success else 1, "\n".join(all_output)


def run_api_tests(env, verbose=False, junit=False):
    """
    API 관련 테스트 실행
    """
    print("\n\n===== API 테스트 실행 =====")
    api_test_directories = ["packages/api/src/tests", "packages/api/tests"]
    success = True
    tests_found = False
    all_output = []

    for test_dir in api_test_directories:
        if os.path.exists(test_dir):
            tests_found = True
            cmd = [sys.executable, "-m", "pytest", test_dir]
            if verbose:
                cmd.append("-v")
            if junit:
                report_dir = test_dir.replace("/", "_")
                cmd.extend(["--junitxml", f"junit_{report_dir}_report.xml"])

            print(f"\n실행: {' '.join(cmd)}")
            return_code, output = run_command(cmd, f"{test_dir} 테스트 실행", env)
            all_output.append(f"--- {test_dir} 테스트 결과 ---\n{output}")

            if return_code != 0:
                success = False
                print(f"❌ {test_dir} 테스트 실패 (종료 코드: {return_code})")
            else:
                print(f"✅ {test_dir} 테스트 성공")

    if not tests_found:
        print("❓ API 테스트 디렉토리를 찾을 수 없습니다. 이 부분은 선택적입니다.")
        return 0, "API 테스트 디렉토리를 찾을 수 없습니다."

    return 0 if success else 1, "\n".join(all_output)


def generate_test_report(results, start_time, end_time, duration):
    """
    테스트 결과 보고서 생성
    """
    report = {
        "test_run": {
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration_seconds": duration.total_seconds(),
            "python_version": PY_VERSION_STR,
            "platform": f"{platform.system()} {platform.release()}",
        },
        "results": results,
        "summary": {
            "total_tests": len(results),
            "successful_tests": sum(
                1 for r in results.values() if r["status"] == "success"
            ),
            "failed_tests": sum(
                1 for r in results.values() if r["status"] == "failure"
            ),
        },
    }

    # 보고서 저장
    try:
        report_path = "test_results.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"\n테스트 보고서가 {report_path}에 저장되었습니다.")

        # 요약 결과 파일 생성
        summary_path = "test_results_summary.txt"
        with open(summary_path, "w", encoding="utf-8") as f:
            f.write(f"테스트 실행 요약\n")
            f.write(f"시작 시간: {start_time.isoformat()}\n")
            f.write(f"종료 시간: {end_time.isoformat()}\n")
            f.write(f"소요 시간: {duration.total_seconds():.2f}초\n")
            f.write(f"총 테스트: {len(results)}\n")
            f.write(
                f"성공: {sum(1 for r in results.values() if r['status'] == 'success')}\n"
            )
            f.write(
                f"실패: {sum(1 for r in results.values() if r['status'] == 'failure')}\n"
            )
            f.write("\n실패한 테스트:\n")
            for name, result in results.items():
                if result["status"] == "failure":
                    f.write(f"- {name}\n")

        print(f"테스트 요약이 {summary_path}에 저장되었습니다.")
    except Exception as e:
        print(f"보고서 저장 중 오류 발생: {e}")

    return report


def main():
    """
    메인 함수 - 테스트 실행
    """
    parser = argparse.ArgumentParser(description="통합 테스트 실행 스크립트")
    parser.add_argument("--git", action="store_true", help="Git 관련 테스트만 실행")
    parser.add_argument("--api", action="store_true", help="API 테스트만 실행")
    parser.add_argument(
        "--gitmanager", action="store_true", help="GitManager 테스트만 실행"
    )
    parser.add_argument("--backup", action="store_true", help="백업 테스트만 실행")
    parser.add_argument("--all", action="store_true", help="모든 테스트 실행")
    parser.add_argument("--verbose", "-v", action="store_true", help="상세 출력 활성화")
    parser.add_argument("--junit", action="store_true", help="JUnit XML 보고서 생성")
    parser.add_argument(
        "--specific", type=str, help="특정 테스트 파일 또는 디렉토리 실행"
    )
    parser.add_argument(
        "--skip-setup", action="store_true", help="초기 환경 설정 단계 건너뛰기"
    )
    parser.add_argument("--export-html", action="store_true", help="HTML 보고서 생성")

    args = parser.parse_args()

    # 환경 설정
    if not args.skip_setup:
        project_root, env = setup_environment()
    else:
        project_root = Path(__file__).parent
        env = os.environ.copy()

    # 테스트 실행 시간 측정 시작
    start_time = datetime.now()

    # 결과 저장
    results = {}

    # 테스트 실행
    if args.specific:
        # 특정 테스트 파일 또는 디렉토리만 실행
        print(f"\n특정 테스트 실행: {args.specific}")
        status, output = run_command(
            [
                sys.executable,
                "-m",
                "pytest",
                args.specific,
                "-v" if args.verbose else "",
            ],
            f"{args.specific} 테스트 실행",
            env,
        )
        results["specific_test"] = {
            "status": "success" if status == 0 else "failure",
            "exit_code": status,
            "output_length": len(output),
        }
    else:
        # Git 테스트 실행
        if args.git or args.all:
            git_status, git_output = run_git_tests(
                env, args.verbose, args.specific, args.junit
            )
            results["git_tests"] = {
                "status": "success" if git_status == 0 else "failure",
                "exit_code": git_status,
                "output_length": len(git_output),
            }

        # GitManager 테스트 실행
        if args.gitmanager or args.all:
            gitmanager_status, gitmanager_output = run_gitmanager_tests(
                env, args.verbose, args.junit
            )
            results["gitmanager_tests"] = {
                "status": "success" if gitmanager_status == 0 else "failure",
                "exit_code": gitmanager_status,
                "output_length": len(gitmanager_output),
            }

        # API 테스트 실행
        if args.api or args.all:
            api_status, api_output = run_api_tests(env, args.verbose, args.junit)
            results["api_tests"] = {
                "status": "success" if api_status == 0 else "failure",
                "exit_code": api_status,
                "output_length": len(api_output),
            }

        # 백업 테스트 실행
        if args.backup or args.all:
            backup_status, backup_output = run_backup_tests(
                env, args.verbose, args.junit
            )
            results["backup_tests"] = {
                "status": "success" if backup_status == 0 else "failure",
                "exit_code": backup_status,
                "output_length": len(backup_output),
            }

    # 테스트 실행 시간 측정 종료
    end_time = datetime.now()
    duration = end_time - start_time

    # 테스트 결과 보고서 생성
    report = generate_test_report(results, start_time, end_time, duration)

    # 종료 코드 설정
    has_failure = any(r["status"] == "failure" for r in results.values())

    # 테스트 결과 출력
    print("\n" + "=" * 50)
    print(f"테스트 실행 완료: {duration.total_seconds():.2f}초 소요")
    print(f"총 테스트: {len(results)}")
    print(f"성공: {sum(1 for r in results.values() if r['status'] == 'success')}")
    print(f"실패: {sum(1 for r in results.values() if r['status'] == 'failure')}")

    # HTML 보고서 생성
    if args.export_html:
        try:
            import pytest_html

            print("HTML 보고서 생성 활성화됨")
        except ImportError:
            print("HTML 보고서 생성에는 pytest-html 플러그인이 필요합니다.")
            print("설치하려면: pip install pytest-html")

    # 종료
    sys.exit(1 if has_failure else 0)


if __name__ == "__main__":
    main()
