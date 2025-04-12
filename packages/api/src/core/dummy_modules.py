"""
더미 모듈 및 클래스 정의.

이 모듈은 실제 의존성 패키지가 없을 때 사용되는 더미 구현을 제공합니다.
"""

# REMOVED: from datetime import datetime


# 더미 함수 및 클래스 정의
class DummySession:
    """세션 임시 클래스"""
    def query(self, _model):
        return DummyQuery()

    def add(self, _obj):
        # 실제 DB에 저장하지 않고 작업 없이 더미로만 동작
        pass

    def commit(self):
        # 실제 DB에 변경사항을 저장하지 않음
        pass

    def refresh(self, _obj):
        # 실제 DB에서 객체를 새로고침하지 않음
        pass


class DummyQuery:
    """쿼리 임시 클래스"""
    def filter_by(self, **_kwargs):
        return self

    def filter(self, *_args):
        return self

    def join(self, *_args, **_kwargs):
        return self

    def all(self):
        return []

    def first(self):
        return None

    def one(self):
        class Result:
            avg_rating = None
            review_count = 0
        return Result()

    def count(self):
        return 0

    def order_by(self, *_args):
        return self

    def offset(self, _n):
        return self

    def limit(self, _n):
        return self

    def delete(self):
        # 실제 DB에서 데이터를 삭제하지 않음
        pass

    def group_by(self, *_args):
        return self

    def label(self, _name):
        return self


class DummyFunc:
    """더미 SQL 함수 클래스"""
    @staticmethod
    def avg(_column):
        return 0

    @staticmethod
    def count(_column):
        return 0


def get_session():
    """세션 가져오기 임시 함수"""
    return DummySession()


def geodesic(_point1, _point2):
    """거리 계산 임시 함수"""
    class Distance:
        def __init__(self):
            self.kilometers = 0
    return Distance()
\n