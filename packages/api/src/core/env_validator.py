"""
환경 변수 검증 모듈.
애플리케이션 시작 시 필요한 환경 변수가 올바르게 설정되어 있는지 검증합니다.
"""

import os
import re
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union
import logging

logger = logging.getLogger("api.env_validator")


class EnvVarType(str, Enum):
    """환경 변수 타입 열거형."""
    
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    URL = "url"
    EMAIL = "email"
    SECRET = "secret"
    PATH = "path"
    JSON = "json"


class EnvVarDefinition:
    """환경 변수 정의 클래스."""
    
    def __init__(
        self,
        name: str,
        var_type: EnvVarType,
        required: bool = True,
        default: Optional[Any] = None,
        description: str = "",
        min_value: Optional[Union[int, float]] = None,
        max_value: Optional[Union[int, float]] = None,
        regex: Optional[str] = None,
        choices: Optional[List[Any]] = None,
        secret: bool = False
    ):
        """
        환경 변수 정의 초기화.
        
        Args:
            name: 환경 변수 이름
            var_type: 환경 변수 타입
            required: 필수 여부
            default: 기본값
            description: 설명
            min_value: 최소값 (숫자형 변수)
            max_value: 최대값 (숫자형 변수)
            regex: 정규식 패턴 (문자열 변수)
            choices: 가능한 값 목록
            secret: 민감 정보 여부 (로깅할 때 가려짐)
        """
        self.name = name
        self.var_type = var_type
        self.required = required
        self.default = default
        self.description = description
        self.min_value = min_value
        self.max_value = max_value
        self.regex = regex
        self.choices = choices
        self.secret = secret or var_type == EnvVarType.SECRET
        
        # 기본값이 있으면 필수 여부는 False로 설정
        if self.default is not None:
            self.required = False
        
        # 타입에 따른 기본 정규식 패턴 설정
        if self.regex is None and self.var_type == EnvVarType.EMAIL:
            self.regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        elif self.regex is None and self.var_type == EnvVarType.URL:
            self.regex = r"^(https?|ftp)://[^\s/$.?#].[^\s]*$"
    
    def validate(self, value: Optional[str]) -> Tuple[bool, Optional[str], Optional[Any]]:
        """
        환경 변수 값 검증.
        
        Args:
            value: 검증할 값
            
        Returns:
            (검증 성공 여부, 실패 시 오류 메시지, 변환된 값)
        """
        # 값이 없는 경우 처리
        if value is None or value == "":
            if self.required:
                return False, f"환경 변수 {self.name}은(는) 필수입니다.", None
            return True, None, self.default
        
        # 타입에 따른 검증 및 변환
        try:
            converted_value = self._convert_value(value)
            
            # 값 범위 검증
            if self._is_numeric_type() and not self._validate_numeric_range(converted_value):
                if self.min_value is not None and converted_value < self.min_value:
                    return False, f"{self.name}의 값은 {self.min_value} 이상이어야 합니다.", None
                if self.max_value is not None and converted_value > self.max_value:
                    return False, f"{self.name}의 값은 {self.max_value} 이하여야 합니다.", None
            
            # 정규식 패턴 검증
            if self.regex and isinstance(converted_value, str) and not re.match(self.regex, converted_value):
                return False, f"{self.name}의 값이 패턴 {self.regex}에 맞지 않습니다.", None
            
            # PATH 타입 존재 여부 검증
            if self.var_type == EnvVarType.PATH and not os.path.exists(converted_value):
                return False, f"{self.name}에 지정된 경로가 존재하지 않습니다: {converted_value}", None
            
            # 선택 사항 검증
            if self.choices and converted_value not in self.choices:
                choices_str = ", ".join(map(str, self.choices))
                return False, f"{self.name}의 값은 다음 중 하나여야 합니다: {choices_str}", None
            
            return True, None, converted_value
            
        except (ValueError, TypeError) as e:
            return False, f"{self.name}의 값을 {self.var_type.value} 타입으로 변환할 수 없습니다: {str(e)}", None
    
    def _is_numeric_type(self) -> bool:
        """숫자형 타입인지 확인."""
        return self.var_type in (EnvVarType.INTEGER, EnvVarType.FLOAT)
    
    def _validate_numeric_range(self, value: Union[int, float]) -> bool:
        """숫자형 값의 범위 유효성 검증."""
        min_valid = self.min_value is None or value >= self.min_value
        max_valid = self.max_value is None or value <= self.max_value
        return min_valid and max_valid
    
    def _convert_value(self, value: str) -> Any:
        """값을 지정된 타입으로 변환."""
        if self.var_type == EnvVarType.INTEGER:
            return int(value)
            
        elif self.var_type == EnvVarType.FLOAT:
            return float(value)
            
        elif self.var_type == EnvVarType.BOOLEAN:
            if value.lower() in ('true', '1', 'yes', 'y'):
                return True
            elif value.lower() in ('false', '0', 'no', 'n'):
                return False
            else:
                raise ValueError(f"{value}는 유효한 boolean 값이 아닙니다")
                
        elif self.var_type == EnvVarType.JSON:
            import json
            return json.loads(value)
            
        # 문자열 타입들
        return value  # STRING, SECRET, URL, EMAIL, PATH 등


class EnvValidator:
    """환경 변수 검증기."""
    
    def __init__(self):
        """환경 변수 검증기 초기화."""
        self.definitions: Dict[str, EnvVarDefinition] = {}
        self.validated_values: Dict[str, Any] = {}
        self.missing_vars: Set[str] = set()
        self.invalid_vars: Dict[str, str] = {}
    
    def register(self, definition: EnvVarDefinition) -> "EnvValidator":
        """
        환경 변수 정의 등록.
        
        Args:
            definition: 등록할 환경 변수 정의
            
        Returns:
            검증기 인스턴스 (체이닝 지원)
        """
        self.definitions[definition.name] = definition
        return self
    
    def register_many(self, definitions: List[EnvVarDefinition]) -> "EnvValidator":
        """
        여러 환경 변수 정의 등록.
        
        Args:
            definitions: 등록할 환경 변수 정의 목록
            
        Returns:
            검증기 인스턴스 (체이닝 지원)
        """
        for definition in definitions:
            self.register(definition)
        return self
    
    def validate_all(self) -> bool:
        """
        모든 등록된 환경 변수 검증.
        
        Returns:
            검증 성공 여부
        """
        self.missing_vars.clear()
        self.invalid_vars.clear()
        
        for name, definition in self.definitions.items():
            value = os.environ.get(name)
            success, error_msg, converted_value = definition.validate(value)
            
            if success:
                if converted_value is not None:
                    self.validated_values[name] = converted_value
                    # 민감한 값이 아닌 경우에만 로깅
                    if not definition.secret:
                        logger.debug(f"환경 변수 {name} = {converted_value}")
                    else:
                        logger.debug(f"환경 변수 {name} = ***FILTERED***")
            else:
                if error_msg and "필수" in error_msg:
                    self.missing_vars.add(name)
                    logger.error(f"필수 환경 변수 {name}이(가) 설정되지 않았습니다.")
                else:
                    self.invalid_vars[name] = error_msg or "알 수 없는 오류"
                    logger.error(f"환경 변수 {name} 검증 실패: {error_msg}")
        
        return not self.missing_vars and not self.invalid_vars
    
    def get(self, name: str, default: Any = None) -> Any:
        """
        검증된 환경 변수 값 조회.
        
        Args:
            name: 환경 변수 이름
            default: 기본값
            
        Returns:
            환경 변수 값 또는 기본값
        """
        return self.validated_values.get(name, default)
    
    def print_summary(self) -> None:
        """검증 결과 요약 출력."""
        total = len(self.definitions)
        valid = len(self.validated_values)
        missing = len(self.missing_vars)
        invalid = len(self.invalid_vars)
        
        logger.info(f"환경 변수 검증 결과: 전체 {total}개 중 {valid}개 유효, {missing}개 누락, {invalid}개 유효하지 않음")
        
        if self.missing_vars:
            logger.warning(f"누락된 환경 변수: {', '.join(self.missing_vars)}")
        
        if self.invalid_vars:
            for name, error in self.invalid_vars.items():
                logger.warning(f"유효하지 않은 환경 변수 {name}: {error}")


# 공통 환경 변수 정의
common_env_vars = [
    EnvVarDefinition(
        name="DATABASE_URL",
        var_type=EnvVarType.STRING,
        required=True,
        description="데이터베이스 연결 URL",
    ),
    EnvVarDefinition(
        name="SECRET_KEY",
        var_type=EnvVarType.SECRET,
        required=True,
        description="애플리케이션 암호화 키",
    ),
    EnvVarDefinition(
        name="DEBUG",
        var_type=EnvVarType.BOOLEAN,
        default=False,
        description="디버그 모드 활성화 여부",
    ),
    EnvVarDefinition(
        name="LOG_LEVEL",
        var_type=EnvVarType.STRING,
        default="info",
        choices=["debug", "info", "warning", "error", "critical"],
        description="로깅 레벨",
    ),
    EnvVarDefinition(
        name="PORT",
        var_type=EnvVarType.INTEGER,
        default=8000,
        min_value=1,
        max_value=65535,
        description="API 서버 포트",
    ),
    EnvVarDefinition(
        name="HOST",
        var_type=EnvVarType.STRING,
        default="0.0.0.0",
        description="API 서버 호스트",
    ),
    EnvVarDefinition(
        name="ALLOWED_ORIGINS",
        var_type=EnvVarType.STRING,
        default="*",
        description="CORS 허용 출처 (콤마로 구분)",
    ),
]

# 환경 변수 검증기 인스턴스 생성
env_validator = EnvValidator().register_many(common_env_vars)


def validate_env() -> bool:
    """
    환경 변수 검증 함수.
    
    Returns:
        검증 성공 여부
    """
    # 필수 변수 누락 시 개발 환경에서 자동 생성
    if os.environ.get("ENVIRONMENT", "").lower() in ["development", "dev", "local"]:
        # SECRET_KEY가 없으면 임시로 생성
        if "SECRET_KEY" not in os.environ:
            import secrets
            os.environ["SECRET_KEY"] = secrets.token_hex(32)
            logger.warning("SECRET_KEY가 없어 임시로 생성했습니다. 프로덕션 환경에서는 반드시 설정하세요.")
            
        # 개발 환경에서 필수 변수가 없으면 기본값 설정
        if "DATABASE_URL" not in os.environ:
            os.environ["DATABASE_URL"] = "sqlite:///./app.db"
            logger.warning("DATABASE_URL이 없어 기본값(SQLite)을 사용합니다.")
            
    success = env_validator.validate_all()
    env_validator.print_summary()
    
    # 개발 환경에서는 일부 검증 오류는 무시 가능
    if not success and os.environ.get("ENVIRONMENT", "").lower() in ["development", "dev", "local"]:
        if not env_validator.missing_vars:  # 누락 변수는 없고 유효하지 않은 변수만 있는 경우
            logger.warning("개발 환경에서 일부 환경 변수 유효성 검증 실패를 무시합니다.")
            return True
    
    return success