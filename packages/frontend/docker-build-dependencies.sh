#!/bin/sh

# 누락된 의존성 패키지 설치
echo "누락된 의존성 패키지 설치 중..."
npm install --save formik@2.4.5 yup@1.3.3

# 필요한 디렉토리 생성
mkdir -p src/locales/ko src/locales/en

# i18n 번역 파일 생성
echo '{
  "greeting": "환영합니다",
  "navigation": {
    "home": "홈",
    "dashboard": "대시보드",
    "settings": "설정"
  }
}' > src/locales/ko/common.json

echo '{
  "title": "인증",
  "login": "로그인",
  "logout": "로그아웃"
}' > src/locales/ko/auth.json

echo '{
  "title": "차량",
  "list": "차량 목록"
}' > src/locales/ko/vehicle.json

echo '{
  "title": "유지보수",
  "schedule": "일정"
}' > src/locales/ko/maintenance.json

echo '{
  "title": "설정",
  "language": "언어"
}' > src/locales/ko/settings.json

# 영어 번역 파일
echo '{
  "greeting": "Welcome",
  "navigation": {
    "home": "Home",
    "dashboard": "Dashboard",
    "settings": "Settings"
  }
}' > src/locales/en/common.json

echo '{
  "title": "Authentication",
  "login": "Login",
  "logout": "Logout"
}' > src/locales/en/auth.json

echo '{
  "title": "Vehicle",
  "list": "Vehicle List"
}' > src/locales/en/vehicle.json

echo '{
  "title": "Maintenance",
  "schedule": "Schedule"
}' > src/locales/en/maintenance.json

echo '{
  "title": "Settings",
  "language": "Language"
}' > src/locales/en/settings.json

# 성공 메시지
echo "프론트엔드 의존성 및 리소스 준비 완료!"
exit 0