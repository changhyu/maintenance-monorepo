#!/bin/bash

# 실행 권한 확인
if [ "$EUID" -ne 0 ]; then
  echo "도커 네트워크 및 볼륨 설정을 위해 관리자 권한이 필요할 수 있습니다."
fi

# 필요한 디렉토리 생성
mkdir -p docker/nginx

# nginx 설정 파일 생성
cat > docker/nginx/default.conf << 'EOF'
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /api/ {
        proxy_pass http://api:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 정적 파일 캐싱 설정
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

echo "도커 네트워크를 생성합니다..."
docker network create maintenance-network 2>/dev/null || true

echo "도커 볼륨을 생성합니다..."
docker volume create postgres-data
docker volume create redis-data

echo "설정이 완료되었습니다."
echo "개발 환경 실행: docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d"
echo "테스트 환경 실행: docker compose -f docker-compose.yml -f docker-compose.test.yml up -d"
echo "프로덕션 환경 실행: docker compose up -d" 