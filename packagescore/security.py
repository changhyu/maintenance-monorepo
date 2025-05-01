"""
Security utilities for authentication, authorization, and data protection
"""
import base64
import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union, List, Tuple
import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import pyotp

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Encryption configuration
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Generate a key if not provided
    # In production, this should be set as an environment variable
    ENCRYPTION_KEY = base64.urlsafe_b64encode(os.urandom(32)).decode()

# Initialize Fernet with the key
fernet = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash
    
    Args:
        plain_password: The plain-text password to verify
        hashed_password: The hashed password to check against
        
    Returns:
        bool: True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Generate a hash from a password
    
    Args:
        password: The password to hash
        
    Returns:
        str: The hashed password
    """
    return pwd_context.hash(password)

def create_access_token(
    data: Dict[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a new JWT access token
    
    Args:
        data: The data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        str: The encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    to_encode.update({"type": "access"})
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(
    data: Dict[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a new JWT refresh token
    
    Args:
        data: The data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        str: The encoded JWT refresh token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        
    to_encode.update({"exp": expire})
    to_encode.update({"type": "refresh"})
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode a JWT token
    
    Args:
        token: The token to decode
        
    Returns:
        Dict: The decoded token payload
        
    Raises:
        jwt.PyJWTError: If token is invalid or expired
    """
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

def generate_secure_token(length: int = 32) -> str:
    """
    Generate a secure random token
    
    Args:
        length: The length of the token in bytes
        
    Returns:
        str: The generated token as a URL-safe base64 string
    """
    return base64.urlsafe_b64encode(os.urandom(length)).decode().rstrip("=")

def generate_api_key() -> str:
    """
    Generate a secure API key
    
    Returns:
        str: A new API key
    """
    return f"sk_{secrets.token_urlsafe(32)}"

def create_hmac_signature(
    key: str, 
    message: str, 
    digest_method: str = "sha256"
) -> str:
    """
    Create an HMAC signature for a message
    
    Args:
        key: The secret key
        message: The message to sign
        digest_method: The hash algorithm to use
        
    Returns:
        str: The hexadecimal digest of the HMAC
    """
    if digest_method == "sha256":
        h = hmac.new(key.encode(), message.encode(), hashlib.sha256)
    elif digest_method == "sha512":
        h = hmac.new(key.encode(), message.encode(), hashlib.sha512)
    else:
        h = hmac.new(key.encode(), message.encode(), hashlib.sha1)
        
    return h.hexdigest()

def verify_hmac_signature(
    key: str, 
    message: str, 
    signature: str, 
    digest_method: str = "sha256"
) -> bool:
    """
    Verify an HMAC signature
    
    Args:
        key: The secret key
        message: The message that was signed
        signature: The signature to verify
        digest_method: The hash algorithm to use
        
    Returns:
        bool: True if signature is valid, False otherwise
    """
    expected_signature = create_hmac_signature(key, message, digest_method)
    return hmac.compare_digest(expected_signature, signature)

def generate_uuid() -> str:
    """
    Generate a random UUID
    
    Returns:
        str: A random UUID
    """
    return str(uuid.uuid4())

def hash_data(data: str, algorithm: str = "sha256") -> str:
    """
    Hash data using the specified algorithm
    
    Args:
        data: The data to hash
        algorithm: The hashing algorithm to use
        
    Returns:
        str: The hexadecimal digest of the hash
    """
    if algorithm == "sha256":
        return hashlib.sha256(data.encode()).hexdigest()
    elif algorithm == "sha512":
        return hashlib.sha512(data.encode()).hexdigest()
    elif algorithm == "md5":
        return hashlib.md5(data.encode()).hexdigest()
    else:
        raise ValueError(f"Unsupported hash algorithm: {algorithm}")

def encrypt_data(data: str) -> str:
    """
    Encrypt data using Fernet symmetric encryption
    
    Args:
        data: The data to encrypt
        
    Returns:
        str: The encrypted data as a base64 string
    """
    if not isinstance(data, bytes):
        data = data.encode()
    encrypted_data = fernet.encrypt(data)
    return encrypted_data.decode()

def decrypt_data(encrypted_data: str) -> str:
    """
    Decrypt data encrypted with the encrypt_data function
    
    Args:
        encrypted_data: The encrypted data as a base64 string
        
    Returns:
        str: The decrypted data
        
    Raises:
        cryptography.fernet.InvalidToken: If the token is invalid or expired
    """
    if not isinstance(encrypted_data, bytes):
        encrypted_data = encrypted_data.encode()
    decrypted_data = fernet.decrypt(encrypted_data)
    return decrypted_data.decode()

def derive_key_from_password(password: str, salt: Optional[bytes] = None) -> Tuple[bytes, bytes]:
    """
    Derive an encryption key from a password using PBKDF2
    
    Args:
        password: The password to derive the key from
        salt: Optional salt, generated if not provided
        
    Returns:
        Tuple[bytes, bytes]: The derived key and the salt used
    """
    if salt is None:
        salt = os.urandom(16)
        
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return key, salt

def encrypt_with_password(data: str, password: str, salt: Optional[bytes] = None) -> Dict[str, str]:
    """
    Encrypt data with a password
    
    Args:
        data: The data to encrypt
        password: The password to use for encryption
        salt: Optional salt, generated if not provided
        
    Returns:
        Dict[str, str]: Dictionary containing the encrypted data and the salt used
    """
    key, salt = derive_key_from_password(password, salt)
    f = Fernet(key)
    encrypted_data = f.encrypt(data.encode())
    
    return {
        "encrypted_data": base64.b64encode(encrypted_data).decode(),
        "salt": base64.b64encode(salt).decode()
    }

def decrypt_with_password(encrypted_data: str, password: str, salt: str) -> str:
    """
    Decrypt data with a password
    
    Args:
        encrypted_data: The encrypted data as a base64 string
        password: The password used for encryption
        salt: The salt used for key derivation
        
    Returns:
        str: The decrypted data
        
    Raises:
        cryptography.fernet.InvalidToken: If the decryption fails
    """
    salt_bytes = base64.b64decode(salt)
    key, _ = derive_key_from_password(password, salt_bytes)
    
    f = Fernet(key)
    encrypted_data_bytes = base64.b64decode(encrypted_data)
    decrypted_data = f.decrypt(encrypted_data_bytes)
    
    return decrypted_data.decode()

# Two-Factor Authentication (2FA) functions
def generate_totp_secret() -> str:
    """
    Generate a secret key for TOTP-based 2FA
    
    Returns:
        str: The secret key in base32 encoding
    """
    return pyotp.random_base32()

def get_totp_uri(secret: str, account_name: str, issuer: str = "YourApp") -> str:
    """
    Get the URI for TOTP that can be used to generate a QR code
    
    Args:
        secret: The TOTP secret
        account_name: The user's account name/email
        issuer: The name of your application
        
    Returns:
        str: The TOTP URI for QR code generation
    """
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=account_name,
        issuer_name=issuer
    )

def verify_totp(secret: str, token: str) -> bool:
    """
    Verify a TOTP token
    
    Args:
        secret: The TOTP secret
        token: The token to verify
        
    Returns:
        bool: True if token is valid, False otherwise
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(token)

def generate_recovery_codes(count: int = 10) -> List[str]:
    """
    Generate recovery codes for 2FA backup
    
    Args:
        count: Number of recovery codes to generate
        
    Returns:
        List[str]: List of recovery codes
    """
    codes = []
    for _ in range(count):
        # Generate a code with format: XXXX-XXXX-XXXX where X is alphanumeric
        code = "-".join([
            "".join(secrets.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ") for _ in range(4))
            for _ in range(3)
        ])
        codes.append(code)
    return codes

# Replace the placeholder implementation with our new function
encrypt_sensitive_value = encrypt_data