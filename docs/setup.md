# 개발 환경 설정 가이드

이 문서는 Maintenance Monorepo 프로젝트의 개발 환경을 설정하는 방법을 설명합니다. 개발자, QA 팀원 및 기술 담당자들을 위한 가이드입니다.

## 목차

1. [필수 요구 사항](#1-필수-요구-사항)
2. [로컬 개발 환경 설정](#2-로컬-개발-환경-설정)
3. [Docker 개발 환경 설정](#3-docker-개발-환경-설정)
4. [환경 변수 구성](#4-환경-변수-구성)
5. [개발 워크플로우](#5-개발-워크플로우)
6. [문제 해결](#6-문제-해결)

## 1. 필수 요구 사항

### 1.1 소프트웨어 요구 사항

이 프로젝트를 개발하기 위해서는 다음 소프트웨어가 필요합니다:

- **Git**: 버전 2.25.0 이상
- **Node.js**: 버전 16.x 이상 (20.x 권장)
- **npm**: 버전 8.x 이상
- **Python**: 버전 3.9 이상 (3.11 권장)
- **Docker**: 버전 20.10.x 이상
- **Docker Compose**: 버전 2.x 이상
- **Visual Studio Code** (권장) 또는 선호하는 IDE

### 1.2 시스템 권장 사양

- **CPU**: 4코어 이상
- **RAM**: 8GB 이상
- **디스크 공간**: 최소 10GB 여유 공간

## 2. 로컬 개발 환경 설정

### 2.1 저장소 복제

```bash
# HTTPS 사용
git clone https://github.com/yourusername/maintenance-monorepo.git

# 또는 SSH 사용
git clone git@github.com:yourusername/maintenance-monorepo.git

# 클론한 디렉토리로 이동
cd maintenance-monorepo
```

### 2.2 Node.js 환경 설정

```bash
# Node.js 의존성 설치
npm install

# 또는 더 빠른 설치를 위해 (권장)
npm ci
```

### 2.3 Python 환경 설정

```bash
# 가상 환경 생성
python -m venv .venv

# 가상 환경 활성화 (Windows)
.venv\Scripts\activate

# 가상 환경 활성화 (macOS/Linux)
source .venv/bin/activate

# Python 패키지 설치
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 2.4 데이터베이스 설정

**SQLite를 사용하는 경우 (개발용):**

```bash
# 데이터베이스 초기화
python -m backend.db.init_db
```

**PostgreSQL을 사용하는 경우:**

1. PostgreSQL이 설치되어 있고 실행 중인지 확인하세요.
2. 다음 SQL 명령을 실행하여 데이터베이스와 사용자를 생성합니다:

```sql
CREATE DATABASE maintenance_db;
CREATE USER maintenance_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE maintenance_db TO maintenance_user;
```

3. `.env` 파일에 데이터베이스 연결 문자열을 설정합니다:

```bash
DATABASE_URL=postgresql://maintenance_user:your_password@localhost:5432/maintenance_db
```

4. 데이터베이스 초기화:

```bash
python -m backend.db.init_db
```

### 2.5 개발 서버 실행

**백엔드 API 서버:**

```bash
# 백엔드 개발 서버 실행
cd backend
python -m uvicorn main:app --reload --port 8000
```

백엔드 서버는 [http://localhost:8000](http://localhost:8000) 에서 접근할 수 있습니다.

**프론트엔드 개발 서버:**

```bash
# 프론트엔드 개발 서버 실행
npm run dev:frontend
```

프론트엔드 개발 서버는 [http://localhost:3000](http://localhost:3000) 에서 접근할 수 있습니다.

## 3. Docker 개발 환경 설정

### 3.1 Docker 컨테이너 실행

```bash
# 모든 서비스 시작
docker-compose up -d

# 특정 서비스만 시작
docker-compose up -d backend frontend
```

### 3.2 서비스 접근

- **백엔드 API**: [http://localhost:8000](http://localhost:8000)
- **프론트엔드**: [http://localhost:3000](http://localhost:3000)
- **API 문서**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3.3 로그 확인

```bash
# 모든 서비스 로그 확인
docker-compose logs -f

# 특정 서비스 로그 확인
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 3.4 컨테이너 관리

```bash
# 컨테이너 상태 확인
docker-compose ps

# 컨테이너 중지
docker-compose stop

# 컨테이너 제거
docker-compose down

# 볼륨과 함께 컨테이너 제거 (데이터베이스 초기화)
docker-compose down -v
```

## 4. 환경 변수 구성

프로젝트는 다음과 같은 환경 파일을 사용합니다:

- `.env`: 기본 환경 변수
- `.env.local`: 로컬 개발 환경 변수 (Git에서 무시됨)
- `.env.development`: 개발 환경 변수
- `.env.production`: 프로덕션 환경 변수

### 4.1 주요 환경 변수

| 변수명 | 설명 | 기본값 | 필수 여부 |
|--------|------|--------|----------|
| `PORT` | 백엔드 서버 포트 | 8000 | 아니오 |
| `HOST` | 백엔드 서버 호스트 | 0.0.0.0 | 아니오 |
| `DATABASE_URL` | 데이터베이스 연결 문자열 | sqlite:///./prod.db | 아니오 |
| `SECRET_KEY` | JWT 토큰 암호화 키 | your-secret-key-here | 예 |
| `DEBUG` | 디버그 모드 활성화 | False | 아니오 |
| `LOG_LEVEL` | 로깅 레벨 | INFO | 아니오 |
| `CORS_ORIGINS` | CORS 허용 출처 | <http://localhost:3000> | 아니오 |

### 4.2 환경 설정 예시

`.env.local` 파일 예시:

```bash
PORT=8000
HOST=localhost
DATABASE_URL=postgresql://maintenance_user:your_password@localhost:5432/maintenance_db
SECRET_KEY=my-super-secret-key-for-development
DEBUG=True
LOG_LEVEL=DEBUG
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 5. 개발 워크플로우

### 5.1 브랜치 전략

본 프로젝트는 Git Flow 브랜치 모델을 따릅니다:

- `main`: 프로덕션 코드
- `develop`: 개발 버전
- `feature/*`: 새로운 기능 개발
- `bugfix/*`: 버그 수정
- `release/*`: 릴리스 준비
- `hotfix/*`: 긴급 수정

### 5.2 새로운 기능 개발

```bash
# develop 브랜치에서 최신 코드 가져오기
git checkout develop
git pull origin develop

# 새 기능 브랜치 생성
git checkout -b feature/my-new-feature

# 작업 후 변경사항 커밋
git add .
git commit -m "feat: 새로운 기능 구현"

# 원격 저장소에 푸시
git push -u origin feature/my-new-feature
```

그런 다음 GitHub에서 `develop` 브랜치로 Pull Request를 생성하세요.

### 5.3 코드 스타일 및 포맷팅

**JavaScript/TypeScript:**

```bash
# 코드 린팅
npm run lint

# 코드 포맷팅
npm run format
```

**Python:**

```bash
# 코드 린팅
flake8 backend

# 코드 포맷팅
black backend
```

### 5.4 테스트 실행

**JavaScript/TypeScript:**

```bash
# 모든 테스트 실행
npm test

# 특정 패키지 테스트
npm test -- packages/frontend
```

**Python:**

```bash
# 모든 테스트 실행
pytest

# 특정 모듈 테스트
pytest backend/tests/test_api.py
```

### 5.5 모노레포 커맨드

프로젝트는 `turbo`를 사용하여 모노레포를 관리합니다:

```bash
# 모든 패키지 빌드
npm run build

# 특정 패키지만 빌드
npm run build -- --filter=frontend

# 개발 서버 실행
npm run dev

# 테스트 실행
npm run test
```

## 6. 문제 해결

### 6.1 알려진 이슈

**노드 모듈 설치 오류:**

```bash
# 노드 모듈 캐시 삭제
rm -rf node_modules
npm cache clean --force
npm install
```

**Python 의존성 문제:**

```bash
# 가상 환경 재생성
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Docker 컨테이너 접근 오류:**

```bash
# Docker 네트워크 재설정
docker-compose down
docker network prune -f
docker-compose up -d
```

### 6.2 로그 확인

**백엔드 로그:**

```bash
# 직접 실행 시
tail -f backend/server.log

# Docker 사용 시
docker-compose logs -f backend
```

**프론트엔드 로그:**

```bash
# 개발 서버 로그는 터미널에 출력됩니다
# 브라우저 콘솔에서도 로그 확인 가능

# Docker 사용 시
docker-compose logs -f frontend
```

### 6.3 데이터베이스 문제

**SQLite:**

```bash
# 데이터베이스 초기화
rm -f prod.db
python -m backend.db.init_db
```

**PostgreSQL:**

```bash
# PostgreSQL 연결 테스트
psql -U maintenance_user -h localhost -d maintenance_db

# PostgreSQL 테이블 초기화
psql -U maintenance_user -h localhost -d maintenance_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
python -m backend.db.init_db
```

### 6.4 Git 서비스 관련 문제

GitService와 관련된 오류가 발생하는 경우:

```bash
# Git 설치 확인
git --version

# GitPython 패치 적용
python patch_python_compat.py

# GitService 수동 설치
./install_git_service.sh
```

### 6.5 도움 요청

문제 해결에 어려움이 있는 경우:

1. GitHub 이슈 확인: 이미 알려진 문제인지 확인
2. 새로운 이슈 생성: 문제 상황과 단계를 자세히 설명
3. 팀 채널에서 문의: 내부 Slack/Teams 채널에서 도움 요청

## 7. IDE 설정

### 7.1 Visual Studio Code

권장 확장 프로그램:

- ESLint
- Prettier
- Python
- Pylance
- Docker
- GitLens
- Jest

settings.json 설정:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "python.formatting.blackArgs": ["--line-length", "100"],
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "python.testing.nosetestsEnabled": false,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "ms-python.python"
  }
}
```

### 7.2 PyCharm

권장 설정:

1. Python 인터프리터: 프로젝트의 가상 환경 선택
2. 코드 스타일: Black formatter 사용
3. 린터: flake8 활성화
4. Node.js 및 NPM: 프로젝트 Node.js 버전 설정

## 8. 성능 최적화 팁

### 8.1 빌드 성능 향상

**모노레포 빌드 캐싱:**

```bash
# Turbo 캐시 활성화
npm run build -- --cache-dir=.turbo-cache
```

**선택적 빌드:**

```bash
# 변경된 패키지만 빌드
npm run build -- --filter=[HEAD^1]
```

### 8.2 개발 환경 성능

**Docker 볼륨 성능:**

Windows/macOS에서 Docker 볼륨 성능 향상을 위해:

1. Docker Desktop 설정에서 리소스 할당 증가
2. 필요한 경우에만 볼륨 마운트 사용

**프론트엔드 개발:**

Vite의 빠른 HMR(Hot Module Replacement)을 활용하세요:

```bash
# Vite 개발 서버 실행
cd packages/frontend
npm run dev
```

**백엔드 개발:**

FastAPI의 자동 리로드 기능을 활용하세요:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## 9. 다른 문서 참조

더 자세한 정보는 다음 문서를 참조하세요:

- [아키텍처 문서](./architecture.md)
- [API 문서](./api.md)
- [배포 가이드](./deployment.md)
- [모니터링 설정 가이드](./monitoring.md)
- [문제 해결 가이드](./troubleshooting.md)
