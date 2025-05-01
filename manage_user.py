#!/usr/bin/env python3
"""
사용자 계정 관리 스크립트
사용법:
- 사용자 생성: python manage_user.py create <username> <email> <password> <role_id>
- 비밀번호 변경: python manage_user.py password <email> <new_password>
"""
import sys
import os
from sqlalchemy.orm import Session

# 백엔드 디렉토리를 Python 경로에 추가
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from backend.db.session import get_db
from backend.models.user import User
from backend.models.role import Role
from backend.core.security import get_password_hash

def create_user(db: Session, username: str, email: str, password: str, role_id: int):
    """새 사용자 생성"""
    # 이메일로 기존 사용자 확인
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        print(f"Error: 이미 존재하는 이메일입니다: {email}")
        return False
    
    # 역할 ID 확인
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        print(f"Error: 존재하지 않는 역할 ID: {role_id}")
        return False
    
    # 사용자 생성
    hashed_password = get_password_hash(password)
    user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        is_active=True,
        role_id=role_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"Success: 사용자가 생성되었습니다. ID={user.id}, 이메일={email}, 역할={role.name}")
    return True

def update_password(db: Session, email: str, new_password: str):
    """기존 사용자의 비밀번호 변경"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"Error: 이메일에 해당하는 사용자가 없습니다: {email}")
        return False
    
    hashed_password = get_password_hash(new_password)
    user.hashed_password = hashed_password
    db.commit()
    print(f"Success: 비밀번호가 변경되었습니다. 사용자={user.username}, 이메일={email}")
    return True

def list_users(db: Session):
    """모든 사용자 목록 표시"""
    users = db.query(User).all()
    print("\n사용자 목록:")
    print("=" * 80)
    print(f"{'ID':<5} {'사용자명':<20} {'이메일':<30} {'활성화':<8} {'역할 ID':<8}")
    print("-" * 80)
    for user in users:
        print(f"{user.id:<5} {user.username:<20} {user.email:<30} {user.is_active:<8} {user.role_id:<8}")
    print("=" * 80)

def list_roles(db: Session):
    """모든 역할 목록 표시"""
    roles = db.query(Role).all()
    print("\n역할 목록:")
    print("=" * 50)
    print(f"{'ID':<5} {'역할명':<20} {'설명':<30}")
    print("-" * 50)
    for role in roles:
        print(f"{role.id:<5} {role.name:<20} {role.description:<30}")
    print("=" * 50)

def main():
    """메인 함수"""
    # 인자 확인
    if len(sys.argv) < 2:
        print("사용법:")
        print("  사용자 생성: python manage_user.py create <username> <email> <password> <role_id>")
        print("  비밀번호 변경: python manage_user.py password <email> <new_password>")
        print("  사용자 목록: python manage_user.py list")
        print("  역할 목록: python manage_user.py roles")
        return

    # 데이터베이스 세션 가져오기
    db = next(get_db())
    
    command = sys.argv[1]
    
    if command == "create" and len(sys.argv) == 6:
        username = sys.argv[2]
        email = sys.argv[3]
        password = sys.argv[4]
        role_id = int(sys.argv[5])
        create_user(db, username, email, password, role_id)
    
    elif command == "password" and len(sys.argv) == 4:
        email = sys.argv[2]
        new_password = sys.argv[3]
        update_password(db, email, new_password)
    
    elif command == "list":
        list_users(db)
    
    elif command == "roles":
        list_roles(db)
    
    else:
        print("잘못된 명령어 또는 인자 수가 잘못되었습니다.")
        print("사용법:")
        print("  사용자 생성: python manage_user.py create <username> <email> <password> <role_id>")
        print("  비밀번호 변경: python manage_user.py password <email> <new_password>")
        print("  사용자 목록: python manage_user.py list")
        print("  역할 목록: python manage_user.py roles")

if __name__ == "__main__":
    main()