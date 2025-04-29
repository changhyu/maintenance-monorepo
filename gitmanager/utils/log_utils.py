"""
로깅 및 민감한 정보 처리 관련 유틸리티

민감한 정보를 마스킹하고 안전하게 로깅하기 위한 클래스 및 함수 제공
"""
import os
import re
import stat
import uuid
import logging
import logging.handlers
from typing import Dict, List, Set, Optional, Union, Any, Callable, Pattern
from pathlib import Path

# 민감한 정보 탐지 패턴
SENSITIVE_PATTERNS = [
    # 기본 인증
    (r'(https?://)([^:]+:[^@]+@)', r'\1***:***@'),
    # API 키 - 길이 제한 완화 (모든 길이 지원)
    (r'(api[_-]?key(?:\s*=\s*|\s*:\s*))(["\']?[\w\-]+["\']?)', r'\1***'),
    # 토큰 - 길이 제한 완화
    (r'(token(?:\s*=\s*|\s*:\s*))(["\']?[\w\-]+["\']?)', r'\1***'),
    # 암호 - 패턴 개선
    (r'(password|passwd|pwd)(?:\s*=\s*|\s*:\s*)([^&\s,]+)', r'\1=***'),
    # 개인 키 - 길이 제한 완화
    (r'(private[_-]?key(?:\s*=\s*|\s*:\s*))(["\']?[\w\-]+["\']?)', r'\1***'),
    # 세션 ID - 길이 제한 완화
    (r'(session[_-]?id(?:\s*=\s*|\s*:\s*))(["\']?[\w\-]+["\']?)', r'\1***'),
    # 시크릿 키 - 길이 제한 완화
    (r'(secret(?:\s*=\s*|\s*:\s*))(["\']?[\w\-]+["\']?)', r'\1***'),
    
    # === 새로 추가된 패턴 ===
    # 신용카드 번호 (주요 카드사 포맷) - 하이픈 포함 패턴 추가
    (r'(?<!\d)(?:4[0-9]{3}(?:[-\s]?[0-9]{4}){3}|5[1-5][0-9]{2}(?:[-\s]?[0-9]{4}){3}|3[47][0-9]{2}(?:[-\s]?[0-9]{4}){2}(?:[-\s]?[0-9]{6})?|6(?:011|5[0-9]{2})(?:[-\s]?[0-9]{4}){3})(?!\d)', r'***CARD***'),
    # 주민등록번호 (한국)
    (r'(?<!\d)[0-9]{6}[-\s]?[1-4][0-9]{6}(?!\d)', r'******-*******'),
    # 소셜 시큐리티 번호 (미국)
    (r'(?<!\d)[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{4}(?!\d)', r'***-**-****'),
    # AWS 액세스 키
    (r'(?:AKIA|A3T|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}', r'***AWS-KEY***'),
    # 이메일 + 비밀번호 조합 (로그인 시도 등에서 발견됨)
    (r'(login|auth|authenticate).*?([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+).*?(password|pwd).*?=.*?([^\s,&"\']+)', 
     r'\1***EMAIL***\3=***'),
]

# 컨텍스트별 패턴 (특정 키워드가 있을 때만 마스킹)
CONTEXT_PATTERNS = {
    'payment': [
        # 결제 컨텍스트에서만 마스킹할 패턴
        (r'(amount|total)(?:\s*=\s*|\s*:\s*)([0-9]+(?:\.[0-9]{1,2})?)', r'\1=***'),
        (r'(card_holder|name)(?:\s*=\s*|\s*:\s*)([^&\s,]+(?:\s+[^&\s,]+)*)', r'\1=***'),
    ],
    'auth': [
        # 인증 컨텍스트에서만 마스킹할 패턴
        (r'(otp|code|verification)(?:\s*=\s*|\s*:\s*)([0-9]{4,8})', r'\1=***'),
        (r'(remember_me|stay_logged_in)(?:\s*=\s*|\s*:\s*)(true|false)', r'\1=***'),
    ],
    'git': [
        # Git 작업 컨텍스트에서만 마스킹할 패턴
        (r'(patch|diff)(?:\s*=\s*|\s*:\s*)([A-Za-z0-9+/]{50,}=*)', r'\1=***BINARY-DATA***'),
    ]
}

class SensitiveFilter(logging.Filter):
    """민감한 정보를 필터링하는 로그 필터"""
    
    def __init__(self, patterns: Optional[List[tuple]] = None, 
                 context_patterns: Optional[Dict[str, List[tuple]]] = None,
                 enable_context_masking: bool = True):
        """
        필터 초기화
        
        Args:
            patterns: (정규식, 대체문자열) 튜플 목록
            context_patterns: 컨텍스트별 패턴 사전
            enable_context_masking: 컨텍스트 인식 마스킹 활성화 여부
        """
        super().__init__()
        self.patterns = patterns or SENSITIVE_PATTERNS
        self.context_patterns = context_patterns or CONTEXT_PATTERNS
        self.enable_context_masking = enable_context_masking
        
        # 정규식 패턴 컴파일 (성능 최적화)
        self.compiled_patterns = [(re.compile(pattern, re.IGNORECASE), replacement) 
                                 for pattern, replacement in self.patterns]
        
        # 컨텍스트별 패턴 컴파일
        self.compiled_context_patterns = {}
        for context, pattern_list in self.context_patterns.items():
            self.compiled_context_patterns[context] = [(re.compile(pattern, re.IGNORECASE), replacement) 
                                                     for pattern, replacement in pattern_list]
        
    def filter(self, record: logging.LogRecord) -> bool:
        """
        로그 레코드 필터링
        
        Args:
            record: 로그 레코드
            
        Returns:
            bool: 항상 True (필터링만 하고 제외하지는 않음)
        """
        if record.getMessage():
            # 메시지를 안전하게 변환
            record.msg = self._mask_sensitive_info(str(record.msg))
            
            # args가 있는 경우 처리
            if record.args:
                args_list = list(record.args)
                for i, arg in enumerate(args_list):
                    if isinstance(arg, str):
                        args_list[i] = self._mask_sensitive_info(arg)
                record.args = tuple(args_list)
                
        return True
        
    def _mask_sensitive_info(self, text: str) -> str:
        """
        텍스트에서 민감한 정보 마스킹
        
        Args:
            text: 원본 텍스트
            
        Returns:
            str: 마스킹된 텍스트
        """
        if not text:
            return text
            
        result = text
        
        # 기본 패턴 마스킹
        for pattern, replacement in self.compiled_patterns:
            result = pattern.sub(replacement, result)
        
        # 컨텍스트 인식 마스킹
        if self.enable_context_masking:
            for context, pattern_list in self.compiled_context_patterns.items():
                # 해당 컨텍스트 관련 키워드가 있는지 확인
                context_keywords = {
                    'payment': ['payment', 'transaction', 'purchase', 'credit', 'card', 'checkout'],
                    'auth': ['login', 'auth', 'signin', 'authenticate', 'credentials', 'verification'],
                    'git': ['commit', 'push', 'pull', 'merge', 'branch', 'repository', 'clone']
                }
                
                if any(keyword in result.lower() for keyword in context_keywords.get(context, [])):
                    # 해당 컨텍스트의 패턴 적용
                    for pattern, replacement in pattern_list:
                        result = pattern.sub(replacement, result)
            
        return result

# 성능 최적화된 마스킹 함수
def mask_sensitive_info(text: str, context: Optional[str] = None) -> str:
    """
    텍스트의 민감한 정보를 마스킹합니다.
    
    Args:
        text: 원본 텍스트
        context: 마스킹 컨텍스트 (선택적)
        
    Returns:
        str: 마스킹된 텍스트
    """
    # 단일 인스턴스 사용 (객체 생성 오버헤드 감소)
    global _filter_instance
    if not hasattr(mask_sensitive_info, '_filter_instance'):
        mask_sensitive_info._filter_instance = SensitiveFilter()
    
    if not text:
        return text
        
    # 컨텍스트가 제공된 경우 해당 컨텍스트 패턴만 적용
    if context and context in CONTEXT_PATTERNS:
        result = text
        # 기본 패턴 적용
        for pattern, replacement in mask_sensitive_info._filter_instance.compiled_patterns:
            result = pattern.sub(replacement, result)
        # 컨텍스트 패턴 적용
        for pattern, replacement in mask_sensitive_info._filter_instance.compiled_context_patterns.get(context, []):
            result = pattern.sub(replacement, result)
        return result
    
    # 컨텍스트가 없으면 모든 패턴 적용
    return mask_sensitive_info._filter_instance._mask_sensitive_info(text)

class SecureFileHandler(logging.handlers.RotatingFileHandler):
    """보안 강화된 파일 핸들러"""
    
    def __init__(self, 
                 filename: str, 
                 mode: str = 'a', 
                 maxBytes: int = 10485760, # 10MB 
                 backupCount: int = 5,
                 encoding: Optional[str] = None):
        """
        핸들러 초기화
        
        Args:
            filename: 로그 파일 경로
            mode: 파일 모드
            maxBytes: 최대 파일 크기
            backupCount: 백업 파일 수
            encoding: 파일 인코딩
        """
        # 로그 디렉토리 생성
        log_dir = os.path.dirname(os.path.abspath(filename))
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
            
            # 디렉토리 권한 설정 (700: 소유자만 읽기/쓰기/실행 가능)
            try:
                os.chmod(log_dir, stat.S_IRWXU)  # 0o700
            except Exception:
                pass
        
        super().__init__(
            filename=filename,
            mode=mode,
            maxBytes=maxBytes,
            backupCount=backupCount,
            encoding=encoding
        )
        
        # 파일 권한 설정 (600: 소유자만 읽기/쓰기 가능)
        try:
            if os.path.exists(filename):
                os.chmod(filename, stat.S_IRUSR | stat.S_IWUSR)  # 0o600
        except Exception:
            pass

    def _open(self):
        """안전하게 로그 파일 열기"""
        # 부모 클래스의 _open 호출
        stream = super()._open()
        
        # 파일 권한 설정
        try:
            os.chmod(self.baseFilename, stat.S_IRUSR | stat.S_IWUSR)  # 0o600
        except Exception:
            pass
            
        return stream

    def doRollover(self):
        """로그 파일 롤오버 시 권한 유지"""
        # 부모 클래스의 doRollover 호출
        super().doRollover()
        
        # 새 파일 권한 설정
        try:
            os.chmod(self.baseFilename, stat.S_IRUSR | stat.S_IWUSR)  # 0o600
        except Exception:
            pass
            
        # 백업 파일 권한 설정
        for i in range(1, self.backupCount + 1):
            backup_file = f"{self.baseFilename}.{i}"
            if os.path.exists(backup_file):
                try:
                    os.chmod(backup_file, stat.S_IRUSR | stat.S_IWUSR)  # 0o600
                except Exception:
                    pass

def setup_secure_logging(
    logger_name: str,
    log_file: Optional[str] = None,
    log_level: int = logging.INFO,
    max_bytes: int = 10485760,  # 10MB
    backup_count: int = 5,
    filter_sensitive: bool = True,
    context_masking: bool = True
) -> logging.Logger:
    """
    안전한 로깅 설정
    
    Args:
        logger_name: 로거 이름
        log_file: 로그 파일 경로
        log_level: 로깅 레벨
        max_bytes: 최대 파일 크기
        backup_count: 백업 파일 수
        filter_sensitive: 민감한 정보 필터링 여부
        context_masking: 컨텍스트 인식 마스킹 활성화 여부
        
    Returns:
        logging.Logger: 구성된 로거
    """
    # 로거 가져오기
    logger = logging.getLogger(logger_name)
    logger.setLevel(log_level)
    
    # 기존 핸들러 제거
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # 포맷터 생성
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] [%(name)s] %(message)s')
    
    # 콘솔 핸들러 추가
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # 파일 핸들러 추가 (지정된 경우)
    if log_file:
        file_handler = SecureFileHandler(
            filename=log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        
        if filter_sensitive:
            sensitive_filter = SensitiveFilter(enable_context_masking=context_masking)
            file_handler.addFilter(sensitive_filter)
            
        logger.addHandler(file_handler)
    
    return logger 