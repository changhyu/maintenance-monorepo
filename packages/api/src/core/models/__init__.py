"""
Core 모델 초기화 파일
"""
try:
    from core.modelstoken import TokenPayload
except ImportError:
    # 임포트 실패 시 기본 클래스 정의
    class TokenPayload:
        """토큰 페이로드 정보를 담는 클래스"""
        def __init__(self, sub: str, exp: int = None):
            self.sub = sub
            self.exp = exp

__all__ = ["TokenPayload"]
