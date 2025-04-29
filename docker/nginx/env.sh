#!/bin/sh

# HTML 파일에서 환경 변수 찾기 및 대체하기
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i 's|__API_URL__|'"${API_URL:-http://localhost:4000}"'|g' {} \;
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i 's|__APP_ENV__|'"${APP_ENV:-production}"'|g' {} \;
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i 's|__APP_VERSION__|'"${APP_VERSION:-1.0.0}"'|g' {} \;

exec "$@"
