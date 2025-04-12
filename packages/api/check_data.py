"""데이터 확인 스크립트"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 데이터베이스 연결
engine = create_engine('postgresql://gongchanghyeon@localhost:5432/maintenance')
Session = sessionmaker(bind=engine)
session = Session()

def print_separator():
    print("\n" + "="*50 + "\n")

try:
    # 각 테이블의 레코드 수 확인
    tables = [
        'users', 'vehicles', 'shops', 'shop_services', 'shop_reviews',
        'shop_images', 'technicians', 'maintenance', 'maintenance_documents',
        'maintenance_parts', 'todos'
    ]

    print("테이블 별 레코드 수:")
    print_separator()

    for table in tables:
        result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
        count = result.scalar()
        print(f"{table}: {count}개")

    print_separator()

    # 사용자 정보 확인
    print("사용자 목록:")
    users = session.execute(text("SELECT id, email, name, role FROM users"))
    for user in users:
        print(f"- {user.name} ({user.email}): {user.role}")

    print_separator()

    # 차량 정보 확인
    print("차량 목록:")
    vehicles = session.execute(text("SELECT v.make, v.model, v.plate, u.name as owner FROM vehicles v JOIN users u ON v.owner_id = u.id"))
    for vehicle in vehicles:
        print(f"- {vehicle.make} {vehicle.model} ({vehicle.plate}), 소유자: {vehicle.owner}")

    print_separator()

    # 정비소 정보 확인
    print("정비소 목록:")
    shops = session.execute(text("SELECT name, type, address, phone FROM shops"))
    for shop in shops:
        print(f"- {shop.name} ({shop.type})")
        print(f"  주소: {shop.address}")
        print(f"  전화: {shop.phone}")

    print_separator()

    # 정비 기록 확인
    print("정비 기록:")
    maintenance = session.execute(text("""
        SELECT m.description, m.date, m.status, m.cost, v.make, v.model
        FROM maintenance m
        JOIN vehicles v ON m.vehicle_id = v.id
        ORDER BY m.date DESC
    """))
    for record in maintenance:
        print(f"- {record.make} {record.model}")
        print(f"  작업: {record.description}")
        print(f"  상태: {record.status}")
        print(f"  비용: {record.cost:,}원")
        print(f"  날짜: {record.date}")
        print()

    print_separator()

    # Todo 목록 확인
    print("할 일 목록:")
    todos = session.execute(text("""
        SELECT t.title, t.status, t.priority, t.due_date,
               u1.name as creator, u2.name as assignee,
               v.make, v.model
        FROM todos t
        JOIN users u1 ON t.user_id = u1.id
        LEFT JOIN users u2 ON t.assignee_id = u2.id
        LEFT JOIN vehicles v ON t.vehicle_id = v.id
        ORDER BY t.due_date
    """))
    for todo in todos:
        print(f"- {todo.title}")
        print(f"  상태: {todo.status}, 우선순위: {todo.priority}")
        print(f"  생성자: {todo.creator}, 담당자: {todo.assignee}")
        if todo.make and todo.model:
            print(f"  차량: {todo.make} {todo.model}")
        print(f"  마감일: {todo.due_date}")
        print()

except Exception as e:
    print(f"오류 발생: {e}")
finally:
    session.close() 