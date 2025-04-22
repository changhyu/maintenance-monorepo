"""
SQLAlchemy 기본 모델 정의
"""

from typing import Any, Dict

from sqlalchemy.orm import declarative_base, declared_attr

Base = declarative_base()


class BaseModel:
    """모든 모델의 기본 클래스"""

    @declared_attr
    def __tablename__(cls) -> str:
        """테이블 이름 자동 생성"""
        return cls.__name__.lower()

    def to_dict(self) -> Dict[str, Any]:
        """모델을 딕셔너리로 변환"""
        return {
            column.name: getattr(self, column.name) for column in self.__table__.columns
        }

    def update(self, **kwargs) -> None:
        """모델 속성 업데이트"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
