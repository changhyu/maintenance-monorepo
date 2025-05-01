#!/usr/bin/env python3
"""
기존 사용자의 비밀번호를 재설정하는 간단한 스크립트
"""
import sys
import os
import sqlite3
from pathlib import Path
from backend.core.security import get_password_hash

# DB 파일 경로
DB_PATH = 'prod.db'

def reset_password(email, new_password):
    """
    이메일로 사용자를 찾아 비밀번호를 재설정합니다.
    """
    if not Path(DB_PATH).exists():
        print(f"오류: 데이터베이스 파일을 찾을 수 없습니다. ({DB_PATH})")
        return False
    
    # 비밀번호 해시 생성
    hashed_password = get_password_hash(new_password)
    
    # 데이터베이스 연결
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 사용자 확인
        cursor.execute("SELECT id, username FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"오류: 이메일 '{email}'에 해당하는 사용자를 찾을 수 없습니다.")
            return False
        
        # 비밀번호 업데이트
        cursor.execute("UPDATE users SET hashed_password = ? WHERE email = ?", (hashed_password, email))
        conn.commit()
        
        print(f"성공: 사용자 '{user[1]}' (ID: {user[0]})의 비밀번호가 재설정되었습니다.")
        return True
    
    except Exception as e:
        print(f"오류 발생: {e}")
        return False
    
    finally:
        conn.close()

def list_users():
    """
    모든 사용자 목록을 출력합니다.
    """
    if not Path(DB_PATH).exists():
        print(f"오류: 데이터베이스 파일을 찾을 수 없습니다. ({DB_PATH})")
        return
    
    # 데이터베이스 연결
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 사용자 목록 조회
        cursor.execute("""
            SELECT u.id, u.username, u.email, r.name as role_name 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id
        """)
        users = cursor.fetchall()
        
        print("\n사용자 목록:")
        print("=" * 80)
        print(f"{'ID':<5} {'사용자명':<15} {'이메일':<30} {'역할':<15}")
        print("-" * 80)
        
        for user in users:
            user_id, username, email, role_name = user
            print(f"{user_id:<5} {username:<15} {email:<30} {role_name:<15}")
        
        print("=" * 80)
    
    except Exception as e:
        print(f"오류 발생: {e}")
    
    finally:
        conn.close()

if __name__ == '__main__':
    # 현재 디렉토리 추가 (백엔드 모듈 import를 위해)
    sys.path.append(os.path.abspath(os.path.dirname(__file__)))
    
    if len(sys.argv) == 1 or sys.argv[1] == 'list':
        list_users()
    
    elif len(sys.argv) == 4 and sys.argv[1] == 'reset':
        email = sys.argv[2]
        new_password = sys.argv[3]
        reset_password(email, new_password)
    
    else:
        print("사용법:")
        print("  사용자 목록 확인: python3 reset_password.py list")
        print("  비밀번호 재설정: python3 reset_password.py reset <email> <new_password>")