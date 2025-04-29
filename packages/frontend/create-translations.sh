#!/bin/sh

# 번역 파일이 저장될 디렉토리 생성
mkdir -p src/locales/ko
mkdir -p src/locales/en

# 한국어 번역 파일 생성
echo '{
  "greeting": "환영합니다",
  "navigation": {
    "home": "홈",
    "dashboard": "대시보드",
    "profile": "프로필",
    "settings": "설정",
    "logout": "로그아웃"
  },
  "buttons": {
    "save": "저장",
    "cancel": "취소",
    "delete": "삭제",
    "edit": "수정"
  }
}' > src/locales/ko/common.json

echo '{
  "login": {
    "title": "로그인",
    "username": "사용자 이름",
    "password": "비밀번호",
    "submit": "로그인",
    "forgotPassword": "비밀번호를 잊으셨나요?",
    "register": "계정 생성"
  },
  "register": {
    "title": "계정 생성",
    "username": "사용자 이름",
    "email": "이메일",
    "password": "비밀번호",
    "confirmPassword": "비밀번호 확인",
    "submit": "가입하기"
  }
}' > src/locales/ko/auth.json

echo '{
  "vehicle": {
    "title": "차량 관리",
    "list": "차량 목록",
    "details": "차량 상세 정보",
    "add": "차량 추가",
    "edit": "차량 정보 수정",
    "delete": "차량 삭제"
  },
  "fields": {
    "make": "제조사",
    "model": "모델",
    "year": "연식",
    "vin": "차량식별번호(VIN)",
    "licensePlate": "번호판",
    "mileage": "주행거리"
  }
}' > src/locales/ko/vehicle.json

echo '{
  "maintenance": {
    "title": "정비 관리",
    "schedule": "정비 일정",
    "history": "정비 이력",
    "upcoming": "예정된 정비",
    "add": "정비 일정 추가",
    "edit": "정비 일정 수정",
    "delete": "정비 일정 삭제"
  },
  "fields": {
    "type": "정비 유형",
    "date": "정비 일자",
    "mileage": "정비 주행거리",
    "cost": "정비 비용",
    "notes": "정비 메모",
    "status": "상태"
  }
}' > src/locales/ko/maintenance.json

echo '{
  "settings": {
    "title": "설정",
    "theme": "테마",
    "language": "언어",
    "notifications": "알림",
    "privacy": "개인정보",
    "profile": "프로필 설정"
  },
  "theme": {
    "light": "밝은 테마",
    "dark": "어두운 테마",
    "system": "시스템 설정 사용"
  }
}' > src/locales/ko/settings.json

# 영어 번역 파일 생성
echo '{
  "greeting": "Welcome",
  "navigation": {
    "home": "Home",
    "dashboard": "Dashboard",
    "profile": "Profile",
    "settings": "Settings",
    "logout": "Logout"
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  }
}' > src/locales/en/common.json

echo '{
  "login": {
    "title": "Login",
    "username": "Username",
    "password": "Password",
    "submit": "Sign In",
    "forgotPassword": "Forgot Password?",
    "register": "Create Account"
  },
  "register": {
    "title": "Register",
    "username": "Username",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "submit": "Sign Up"
  }
}' > src/locales/en/auth.json

echo '{
  "vehicle": {
    "title": "Vehicle Management",
    "list": "Vehicle List",
    "details": "Vehicle Details",
    "add": "Add Vehicle",
    "edit": "Edit Vehicle",
    "delete": "Delete Vehicle"
  },
  "fields": {
    "make": "Make",
    "model": "Model",
    "year": "Year",
    "vin": "VIN",
    "licensePlate": "License Plate",
    "mileage": "Mileage"
  }
}' > src/locales/en/vehicle.json

echo '{
  "maintenance": {
    "title": "Maintenance Management",
    "schedule": "Maintenance Schedule",
    "history": "Maintenance History",
    "upcoming": "Upcoming Maintenance",
    "add": "Add Maintenance",
    "edit": "Edit Maintenance",
    "delete": "Delete Maintenance"
  },
  "fields": {
    "type": "Type",
    "date": "Date",
    "mileage": "Mileage",
    "cost": "Cost",
    "notes": "Notes",
    "status": "Status"
  }
}' > src/locales/en/maintenance.json

echo '{
  "settings": {
    "title": "Settings",
    "theme": "Theme",
    "language": "Language",
    "notifications": "Notifications",
    "privacy": "Privacy",
    "profile": "Profile Settings"
  },
  "theme": {
    "light": "Light Theme",
    "dark": "Dark Theme",
    "system": "Use System Setting"
  }
}' > src/locales/en/settings.json

echo "번역 파일 생성 완료!"