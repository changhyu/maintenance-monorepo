#!/bin/bash
# Docker 환경 보안 설정 스크립트
# 실행 방법: sudo ./secure-docker-setup.sh

set -e

echo "===== Docker 환경 보안 설정 시작 ====="

# 필요한 디렉토리 생성
mkdir -p ./docker/secrets

# 데이터베이스 패스워드 생성
if [ ! -f ./docker/secrets/db_password.txt ]; then
    echo "데이터베이스 패스워드 생성"
    openssl rand -base64 32 > ./docker/secrets/db_password.txt
    chmod 600 ./docker/secrets/db_password.txt
fi

# Grafana 패스워드 생성
if [ ! -f ./docker/secrets/grafana_password.txt ]; then
    echo "Grafana 패스워드 생성"
    openssl rand -base64 16 > ./docker/secrets/grafana_password.txt
    chmod 600 ./docker/secrets/grafana_password.txt
fi

# Docker 데몬 보안 설정
echo "Docker 데몬 보안 설정 적용"
cat > /etc/docker/daemon.json << EOF
{
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "userns-remap": "default",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Docker 서비스 재시작
echo "Docker 서비스 재시작"
systemctl restart docker

# Docker Compose 파일 권한 설정
echo "Docker Compose 파일 권한 설정"
chmod 644 docker-compose.yml
chmod 644 docker-compose.override.yml
chmod 644 docker-compose.prod.yml

# 보안 스캐너 설치 (선택적)
echo "Docker 보안 스캐너 설치 확인"
if ! command -v trivy &> /dev/null; then
    echo "Trivy 설치 (Docker 이미지 보안 스캐너)"
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
fi

# Docker Bench Security 확인
echo "Docker Bench Security 확인"
if [ ! -d "./docker-bench-security" ]; then
    echo "Docker Bench Security 다운로드"
    git clone https://github.com/docker/docker-bench-security.git
fi

echo "===== Docker 환경 보안 설정 완료 ====="
echo "Docker 환경이 보안 모범 사례에 따라 설정되었습니다."
echo "추가적인 보안 강화를 위해 다음을 실행하세요:"
echo "  1. ./docker-bench-security/docker-bench-security.sh"
echo "  2. ./docker-security/docker-scan.sh <Dockerfile경로>"
echo "  3. ./security-checks/weekly_docker_scan.sh"
