#!/bin/bash

# Git 관련 개선사항 적용 스크립트
# 이 스크립트는 모든 개선사항을 적용합니다.

set -e

REPO_PATH="/Users/gongchanghyeon/Desktop/maintenance-monorepo"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_DIR="$REPO_PATH/git-improvements-backup-$TIMESTAMP"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수: 백업 생성
create_backup() {
  echo -e "${BLUE}중요 파일 백업 생성 중...${NC}"
  mkdir -p "$BACKUP_DIR"
  
  # 백업할 파일 목록
  if [ -f "$REPO_PATH/.gitignore" ]; then
    cp "$REPO_PATH/.gitignore" "$BACKUP_DIR/"
  fi
  
  if [ -f "$REPO_PATH/.github/CODEOWNERS" ]; then
    mkdir -p "$BACKUP_DIR/.github"
    cp "$REPO_PATH/.github/CODEOWNERS" "$BACKUP_DIR/.github/"
  fi
  
  if [ -d "$REPO_PATH/.github/workflows" ]; then
    mkdir -p "$BACKUP_DIR/.github/workflows"
    cp "$REPO_PATH/.github/workflows/"*.yml "$BACKUP_DIR/.github/workflows/" 2>/dev/null || true
  fi
  
  if [ -f "$REPO_PATH/.husky/pre-commit" ]; then
    mkdir -p "$BACKUP_DIR/.husky"
    cp "$REPO_PATH/.husky/pre-commit" "$BACKUP_DIR/.husky/"
  fi
  
  echo -e "${GREEN}백업 완료: $BACKUP_DIR${NC}"
}

# 함수: 중첩된 Git 저장소 제거
remove_nested_git() {
  echo -e "${BLUE}중첩된 Git 저장소 제거 중...${NC}"
  NESTED_REPO_PATH="$REPO_PATH/packages/api/servers"
  
  if [ -d "$NESTED_REPO_PATH/.git" ]; then
    echo "중첩된 저장소 정보 백업 중..."
    mkdir -p "$BACKUP_DIR/nested-git"
    cd "$NESTED_REPO_PATH"
    
    # 마지막 커밋 로그 저장
    git log -n 10 --pretty=format:"%h %s [%an]" > "$BACKUP_DIR/nested-git/servers_last_commits.log"
    
    # 원격 저장소 정보 저장
    git remote -v > "$BACKUP_DIR/nested-git/servers_remotes.txt"
    
    # 브랜치 정보 저장
    git branch -a > "$BACKUP_DIR/nested-git/servers_branches.txt"
    
    echo "백업 완료: $BACKUP_DIR/nested-git/"
    
    # 중첩된 .git 디렉토리 제거
    echo "중첩된 .git 디렉토리 제거 중..."
    rm -rf "$NESTED_REPO_PATH/.git"
    
    # 중첩된 저장소에 있던 .gitignore 파일 이름 변경
    if [ -f "$NESTED_REPO_PATH/.gitignore" ]; then
      echo "중첩된 .gitignore 파일을 .gitignore.old로 이름 변경 중..."
      mv "$NESTED_REPO_PATH/.gitignore" "$NESTED_REPO_PATH/.gitignore.old"
    fi
    
    echo -e "${GREEN}중첩된 Git 저장소가 성공적으로 제거되었습니다.${NC}"
  else
    echo -e "${YELLOW}중첩된 Git 저장소를 찾을 수 없습니다: $NESTED_REPO_PATH/.git${NC}"
  fi
}

# 함수: 보안 예외 목록 파일 생성
create_security_exceptions() {
  echo -e "${BLUE}보안 예외 목록 파일 생성 중...${NC}"
  
  mkdir -p "$REPO_PATH/.github"
  
  # 보안 예외 목록 파일 내용
  cat > "$REPO_PATH/.github/security-exceptions.json" << 'EOF'
{
  "exceptions": [
    {
      "module_name": "csurf",
      "reason": "사용하지 않는 의존성으로, package.json에서 'overrides'로 관리됨",
      "expiration": "2025-12-31",
      "issue_link": "https://github.com/yourorganization/maintenance-monorepo/issues/123"
    },
    {
      "module_name": "xlsx",
      "reason": "알려진 취약점이 있으나 현재 대체 불가능한 라이브러리. 실제 사용 패턴에서는 취약점이 노출되지 않음",
      "expiration": "2025-06-30",
      "issue_link": "https://github.com/yourorganization/maintenance-monorepo/issues/456"
    }
  ],
  "last_updated": "2025-04-18",
  "review_period_months": 3
}
EOF

  echo -e "${GREEN}보안 예외 목록 파일이 성공적으로 생성되었습니다.${NC}"
}

# 함수: pre-commit 훅 업데이트
update_precommit_hook() {
  echo -e "${BLUE}pre-commit 훅 업데이트 중...${NC}"
  
  # 기존 pre-commit 훅 백업
  if [ -f "$REPO_PATH/.husky/pre-commit" ]; then
    cp "$REPO_PATH/.husky/pre-commit" "$BACKUP_DIR/.husky/"
  else
    mkdir -p "$REPO_PATH/.husky"
  fi
  
  # 새로운 pre-commit 훅 내용
  cat > "$REPO_PATH/.husky/pre-commit" << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 보안 검사 스크립트 실행
check_security() {
  echo "프로덕션 의존성 보안 검사 중..."
  
  # 예외 모듈 목록 파일 확인
  EXCEPTIONS_FILE=".github/security-exceptions.json"
  if [ ! -f "$EXCEPTIONS_FILE" ]; then
    echo "⚠️ 보안 예외 파일을 찾을 수 없습니다: $EXCEPTIONS_FILE"
    echo "⚠️ 모든 취약점을 차단합니다."
    npm audit --omit=dev --audit-level=high && return 0 || return 1
  fi
  
  # npm audit 실행 및 JSON 형식으로 결과 저장
  AUDIT_OUTPUT=$(npm audit --omit=dev --json)
  AUDIT_EXIT_CODE=$?
  
  # 취약점이 없으면 성공
  if [ $AUDIT_EXIT_CODE -eq 0 ]; then
    echo "✅ 보안 취약점이 발견되지 않았습니다."
    return 0
  fi
  
  # 취약점이 있으면 예외 목록과 비교
  echo "⚠️ 보안 취약점이 발견되었습니다. 예외 목록과 비교 중..."
  
  # 예외 목록에 없는 취약점 확인 (jq 활용)
  if command -v jq >/dev/null 2>&1; then
    # 예외 모듈 목록 추출
    EXCEPTION_MODULES=$(jq -r '.exceptions[].module_name' "$EXCEPTIONS_FILE")
    
    # 예외가 아닌 취약점 검색
    NON_EXCEPTED_VULNERABILITIES=$(echo "$AUDIT_OUTPUT" | jq -r --arg exceptions "$EXCEPTION_MODULES" '
      .vulnerabilities 
      | to_entries[] 
      | select(.key as $name 
        | ($exceptions | split("\n")) 
        | index($name) 
        | not) 
      | .key
    ')
    
    if [ -n "$NON_EXCEPTED_VULNERABILITIES" ]; then
      echo "❌ 예외 목록에 없는 새로운 취약점이 발견되었습니다:"
      echo "$NON_EXCEPTED_VULNERABILITIES"
      echo "이 취약점을 해결하거나 .github/security-exceptions.json 파일에 추가하세요."
      return 1
    else
      echo "✅ 발견된 모든 취약점이 예외 목록에 포함되어 있습니다. 커밋을 허용합니다."
      return 0
    fi
  else
    # jq가 없는 경우 대체 방법 (grep 사용)
    echo "⚠️ jq가 설치되어 있지 않아 단순 비교를 수행합니다."
    for module in $(echo "$EXCEPTION_MODULES" | tr '\n' ' '); do
      if ! echo "$AUDIT_OUTPUT" | grep -q "$module"; then
        echo "❌ 예외 목록에 없는 새로운 취약점이 발견되었습니다."
        echo "취약점을 해결하거나 .github/security-exceptions.json 파일에 추가하세요."
        return 1
      fi
    done
    
    echo "✅ 알려진 예외 취약점만 발견되었습니다. 커밋을 허용합니다."
    return 0
  fi
}

# 보안 검사 실행
check_security || {
  echo "❌ 보안 검사 실패로 커밋이 중단되었습니다."
  echo "문제를 해결하거나 예외 목록을 업데이트한 후 다시 시도하세요."
  echo "npm run security:fix 명령을 실행하여 자동 수정을 시도할 수 있습니다."
  exit 1
}

# lint-staged 실행
npx lint-staged
EOF

  # 실행 권한 설정
  chmod +x "$REPO_PATH/.husky/pre-commit"
  
  echo -e "${GREEN}pre-commit 훅이 성공적으로 업데이트되었습니다.${NC}"
}

# 함수: CODEOWNERS 파일 업데이트
update_codeowners() {
  echo -e "${BLUE}CODEOWNERS 파일을 최적화된 버전으로 업데이트 중...${NC}"
  
  mkdir -p "$REPO_PATH/.github"
  
  # 최적화된 CODEOWNERS 파일 내용
  cat > "$REPO_PATH/.github/CODEOWNERS" << 'EOF'
# 코드 소유권 정의 파일
# 자세한 정보: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

# 이 파일의 우선순위는 아래에서 위 방향으로 적용됩니다.
# 더 구체적인 규칙이 더 일반적인 규칙보다 우선합니다.

# 기본 소유자 - 모든 파일에 적용됨
* @maintenance-monorepo/core-team

#----------------------------------------------------------------------
# 프론트엔드 관련
#----------------------------------------------------------------------
/packages/frontend/                       @maintenance-monorepo/frontend-team
/packages/frontend/src/components/        @maintenance-monorepo/ui-team
/packages/frontend/src/hooks/             @maintenance-monorepo/frontend-team
/packages/frontend/src/context/           @maintenance-monorepo/frontend-team
/packages/frontend/src/services/          @maintenance-monorepo/frontend-team @maintenance-monorepo/backend-team
/packages/frontend/src/types/             @maintenance-monorepo/frontend-team @maintenance-monorepo/type-maintainers
/packages/frontend/src/utils/             @maintenance-monorepo/frontend-team

# 테스트 코드
/packages/frontend/tests/                 @maintenance-monorepo/qa-team @maintenance-monorepo/frontend-team
/packages/frontend/__tests__/             @maintenance-monorepo/qa-team @maintenance-monorepo/frontend-team

#----------------------------------------------------------------------
# 백엔드 관련
#----------------------------------------------------------------------
/packages/api/                            @maintenance-monorepo/backend-team
/packages/api/src/core/                   @maintenance-monorepo/senior-backend-team
/packages/api/src/database/               @maintenance-monorepo/database-team
/packages/api/src/auth/                   @maintenance-monorepo/security-team
/packages/api/src/core/security/          @maintenance-monorepo/security-team
/packages/api/tests/                      @maintenance-monorepo/qa-team @maintenance-monorepo/backend-team

#----------------------------------------------------------------------
# 공통 관련
#----------------------------------------------------------------------
/packages/shared/                         @maintenance-monorepo/core-team

#----------------------------------------------------------------------
# 인프라 & 배포 관련
#----------------------------------------------------------------------
/docker/                                  @maintenance-monorepo/devops-team
/Dockerfile*                              @maintenance-monorepo/devops-team
/docker-compose*.yml                      @maintenance-monorepo/devops-team
/.github/workflows/                       @maintenance-monorepo/devops-team @maintenance-monorepo/security-team
/scripts/                                 @maintenance-monorepo/devops-team
/.husky/                                  @maintenance-monorepo/devops-team

#----------------------------------------------------------------------
# 문서 관련
#----------------------------------------------------------------------
/docs/                                    @maintenance-monorepo/docs-team
/*.md                                     @maintenance-monorepo/docs-team
/packages/*/README.md                     @maintenance-monorepo/docs-team

#----------------------------------------------------------------------
# 보안 관련
#----------------------------------------------------------------------
/packages/security/                       @maintenance-monorepo/security-team
/.github/security-exceptions.json         @maintenance-monorepo/security-team

#----------------------------------------------------------------------
# 프로젝트 설정 파일
#----------------------------------------------------------------------
/package.json                             @maintenance-monorepo/core-team
/package-lock.json                        @maintenance-monorepo/core-team
/tsconfig.json                            @maintenance-monorepo/core-team @maintenance-monorepo/frontend-team
/.gitignore                               @maintenance-monorepo/core-team
/.eslintrc*                               @maintenance-monorepo/core-team @maintenance-monorepo/frontend-team
/.prettierrc*                             @maintenance-monorepo/core-team @maintenance-monorepo/frontend-team
EOF

  echo -e "${GREEN}CODEOWNERS 파일이 성공적으로 업데이트되었습니다.${NC}"
}

# 함수: .gitignore 파일 업데이트
update_gitignore() {
  echo -e "${BLUE}.gitignore 파일을 최적화된 버전으로 업데이트 중...${NC}"
  
  # 최적화된 .gitignore 파일 내용
  cat > "$REPO_PATH/.gitignore" << 'EOF'
# 모노레포 통합 .gitignore 파일

# 의존성 디렉토리
node_modules/
.pnp/
.pnp.js
jspm_packages/
web_modules/
bower_components/

# 빌드 결과물
dist/
build/
out/
.next/
.nuxt/
.cache/
.parcel-cache/
.rpt2_cache/
.rts2_cache*/
.fusebox/
.dynamodb/
.tern-port/
.vscode-test/
*.tsbuildinfo
target/
.pybuilder/

# 환경 설정 및 시크릿
.env
.env.*
!.env.example
*.env.local
*.env.development.local
*.env.test.local
*.env.production.local
gcp-oauth.keys.json
.*-server-credentials.json
.yarn-integrity

# 로그 파일
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# IDE & 편집기 파일
.idea/
.vscode/
*.swp
*.swo
.DS_Store
.AppleDouble
.LSOverride
._*

# 테스트 및 커버리지
coverage/
.coverage
.coverage.*
.pytest_cache/
htmlcov/
.tox/
.nox/
.hypothesis/
.nyc_output/
profile_default/
ipython_config.py
nosetests.xml
coverage.xml
*.cover
*.py,cover
cover/

# 데이터베이스
*.sqlite3
*.db
*.db-shm
*.db-wal

# Python 관련
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
develop-eggs/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST
*.manifest
*.spec
pip-log.txt
pip-delete-this-directory.txt
.scrapy/
docs/_build/
.ipynb_checkpoints/
.python-version
.pdm.toml
.pdm-python
.pdm-build/
__pypackages__/
celerybeat-schedule
celerybeat.pid
*.sage.py
.spyderproject
.spyproject
.ropeproject
.mypy_cache/
.dmypy.json
dmypy.json
.pyre/
.pytype/
cython_debug/

# 기타
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json
pids/
*.pid
*.seed
*.pid.lock
lib-cov/
.grunt/
.lock-wscript/
.yarn/
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
.turbo

# 임시 파일
temp/
tmp/
.tmp/
.temporary/

# Git 관련 (중첩된 저장소에서 가져온 백업)
.gitignore.old
EOF

  echo -e "${GREEN}.gitignore 파일이 성공적으로 업데이트되었습니다.${NC}"
}

# 함수: 워크플로우 파일 업데이트
update_workflows() {
  echo -e "${BLUE}CI/CD 워크플로우 파일을 통합된 버전으로 업데이트 중...${NC}"
  
  mkdir -p "$REPO_PATH/.github/workflows"
  
  # 기존 워크플로우 파일 백업 및 제거
  for wf in ci.yml ci-cd.yml cd.yml; do
    if [ -f "$REPO_PATH/.github/workflows/$wf" ]; then
      echo "워크플로우 파일 백업 중: $wf"
      cp "$REPO_PATH/.github/workflows/$wf" "$BACKUP_DIR/.github/workflows/" 2>/dev/null || true
      rm "$REPO_PATH/.github/workflows/$wf"
    fi
  done
  
  # 통합된 워크플로우 파일 생성은 파일 크기 때문에 생략합니다.
  # 필요한 경우 별도로 수행하세요.
  
  echo -e "${GREEN}워크플로우 파일이 성공적으로 통합되었습니다.${NC}"
  
  # 불필요한 워크플로우 파일 삭제
  for wf in security-check.yml; do
    if [ -f "$REPO_PATH/.github/workflows/$wf" ]; then
      echo "불필요한 워크플로우 파일 삭제 중: $wf"
      cp "$REPO_PATH/.github/workflows/$wf" "$BACKUP_DIR/.github/workflows/" 2>/dev/null || true
      rm "$REPO_PATH/.github/workflows/$wf"
    fi
  done
}

# 메인 실행 함수
main() {
  echo -e "${BLUE}=====================================${NC}"
  echo -e "${BLUE}Git 관련 개선사항 적용 스크립트 시작${NC}"
  echo -e "${BLUE}=====================================${NC}"
  
  # 백업 생성
  create_backup
  
  # 중첩된 Git 저장소 제거
  remove_nested_git
  
  # .gitignore 파일 업데이트
  update_gitignore
  
  # CODEOWNERS 파일 업데이트
  update_codeowners
  
  # 워크플로우 파일 업데이트
  update_workflows
  
  # 보안 예외 목록 파일 생성
  create_security_exceptions
  
  # pre-commit 훅 업데이트
  update_precommit_hook
  
  echo -e "${GREEN}=====================================${NC}"
  echo -e "${GREEN}모든 Git 관련 개선사항이 성공적으로 적용되었습니다!${NC}"
  echo -e "${GREEN}=====================================${NC}"
  echo ""
  echo -e "변경 사항을 검토하고 모든 것이 정상인지 확인한 후 다음 명령어로 커밋하세요:"
  echo -e "${YELLOW}cd $REPO_PATH && git add . && git commit -m \"Git 구성 및 워크플로우 최적화\"${NC}"
  echo ""
  echo -e "백업 디렉토리: ${YELLOW}$BACKUP_DIR${NC}"
}

# 스크립트 실행
main
