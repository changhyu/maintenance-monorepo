#!/usr/bin/env python
"""
테스트 실행 스크립트
"""
import os
import sys
import subprocess
import platform
import argparse

def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description='테스트 실행 스크립트')
    parser.add_argument('--test', type=str, default='tests/test_maintenance.py',
                        help='실행할 테스트 파일 또는 디렉토리 (기본값: tests/test_maintenance.py)')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='상세 출력 모드')
    parser.add_argument('--docker', '-d', action='store_true',
                        help='Docker 컨테이너로 테스트 실행')
    
    args = parser.parse_args()
    
    # 프로젝트 루트 디렉토리 확인
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)
    
    if args.docker:
        # Docker 컨테이너로 테스트 실행
        cmd = ['docker-compose', '-f', 'docker-compose.test.yml', 'up', '--build']
        print(f"Docker 컨테이너로 테스트를 실행합니다: {' '.join(cmd)}")
    else:
        # 직접 pytest 실행
        cmd = [sys.executable, '-m', 'pytest', args.test]
        if args.verbose:
            cmd.append('-v')
        print(f"테스트를 실행합니다: {' '.join(cmd)}")
    
    try:
        # 테스트 명령 실행
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # 실시간으로 출력 표시
        for line in process.stdout:
            sys.stdout.write(line)
        
        # 프로세스 종료 대기 및 결과 확인
        return_code = process.wait()
        
        if return_code == 0:
            print("\n✅ 테스트가 성공적으로 완료되었습니다!")
        else:
            print(f"\n❌ 테스트 실행 중 오류가 발생했습니다. (종료 코드: {return_code})")
            sys.exit(return_code)
            
    except KeyboardInterrupt:
        print("\n테스트가 사용자에 의해 중단되었습니다.")
        sys.exit(1)
    except Exception as e:
        print(f"\n테스트 실행 중 예외가 발생했습니다: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main() 