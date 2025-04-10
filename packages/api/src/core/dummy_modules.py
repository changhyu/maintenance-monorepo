"""
더미 모듈 및 클래스 정의.

이 모듈은 실제 의존성 패키지가 없을 때 사용되는 더미 구현을 제공합니다.
"""

from datetime import datetime


# 더미 함수 및 클래스 정의
class DummySession:
    """세션 임시 클래스"""
    def query(self, model):
        return DummyQuery()
    
    def add(self, obj):
        pass
    
    def commit(self):
        pass
    
    def refresh(self, obj):
        pass


class DummyQuery:
    """쿼리 임시 클래스"""
    def filter_by(self, **kwargs):
        return self
    
    def filter(self, *args):
        return self
    
    def join(self, *args, **kwargs):
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
    
    def order_by(self, *args):
        return self
    
    def offset(self, n):
        return self
    
    def limit(self, n):
        return self
    
    def delete(self):
        pass
    
    def group_by(self, *args):
        return self
    
    def label(self, name):
        return self


class DummyFunc:
    """더미 SQL 함수 클래스"""
    @staticmethod
    def avg(column):
        return 0
    
    @staticmethod
    def count(column):
        return 0


def get_session():
    """세션 가져오기 임시 함수"""
    return DummySession()


def geodesic(point1, point2):
    """거리 계산 임시 함수"""
    class Distance:
        def __init__(self):
            self.kilometers = 0
    return Distance() 