import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def print_separator():
    print("\n" + "=" * 50 + "\n")


def print_table_info(cur, table_name):
    print(f"\n테이블: {table_name}")

    # 컬럼 정보 조회
    print("\n[컬럼 정보]")
    cur.execute(
        """
        SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default,
            udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position;
    """,
        (table_name,),
    )
    columns = cur.fetchall()

    for col in columns:
        col_name, data_type, max_length, is_nullable, default, udt_name = col
        type_info = f"{data_type}"
        if max_length:
            type_info += f"({max_length})"
        if udt_name in ("_varchar", "_text", "_int4", "_bool"):
            type_info += " ARRAY"
        nullable = "NULL 허용" if is_nullable == "YES" else "NULL 불가"
        default_str = f", 기본값: {default}" if default else ""
        print(f"  - {col_name}: {type_info} ({nullable}{default_str})")

    # 제약조건 정보 조회
    print("\n[제약조건]")
    cur.execute(
        """
        SELECT
            tc.constraint_type,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public' AND tc.table_name = %s;
    """,
        (table_name,),
    )
    constraints = cur.fetchall()

    if constraints:
        for con_type, con_name, col_name, ref_table, ref_col in constraints:
            if con_type == "PRIMARY KEY":
                print(f"  - 기본키: {col_name}")
            elif con_type == "FOREIGN KEY":
                print(f"  - 외래키: {col_name} -> {ref_table}.{ref_col}")
            elif con_type == "UNIQUE":
                print(f"  - 유니크: {col_name}")
    else:
        print("  - 없음")

    # 인덱스 정보 조회
    print("\n[인덱스]")
    cur.execute(
        """
        SELECT
            i.relname as index_name,
            a.attname as column_name,
            ix.indisunique as is_unique,
            ix.indisprimary as is_primary
        FROM
            pg_class t,
            pg_class i,
            pg_index ix,
            pg_attribute a
        WHERE
            t.oid = ix.indrelid
            AND i.oid = ix.indexrelid
            AND a.attrelid = t.oid
            AND a.attnum = ANY(ix.indkey)
            AND t.relkind = 'r'
            AND t.relname = %s;
    """,
        (table_name,),
    )
    indexes = cur.fetchall()

    if indexes:
        for idx_name, col_name, is_unique, is_primary in indexes:
            idx_type = []
            if is_primary:
                idx_type.append("PRIMARY KEY")
            if is_unique:
                idx_type.append("UNIQUE")
            type_str = f" ({', '.join(idx_type)})" if idx_type else ""
            print(f"  - {idx_name} on {col_name}{type_str}")
    else:
        print("  - 없음")

    # 레코드 수 조회
    cur.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cur.fetchone()[0]
    print(f"\n[레코드 수]: {count}개")


try:
    # 데이터베이스 연결
    conn = psycopg2.connect(
        dbname="maintenance", user="gongchanghyeon", host="localhost", port="5432"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    # 테이블 목록 조회
    cur.execute(
        """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """
    )
    tables = cur.fetchall()

    print("데이터베이스 테이블 상태 확인")
    print_separator()

    print(f"총 테이블 수: {len(tables)}")
    print("\n테이블 목록:")
    for (table,) in tables:
        print(f"- {table}")

    print_separator()

    # 각 테이블의 상세 정보 출력
    for (table,) in tables:
        print_table_info(cur, table)
        print_separator()

except Exception as e:
    print(f"오류 발생: {e}")
finally:
    if "cur" in locals():
        cur.close()
    if "conn" in locals():
        conn.close()
