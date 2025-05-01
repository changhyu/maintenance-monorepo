import jwt
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple, Union

from config import config
from logger import Logger

logger = Logger.get_logger(__name__)

class AuthError(Exception):
    """Custom exception for authentication and authorization errors."""
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class Auth:
    """Authentication and authorization handler for the application."""
    
    @staticmethod
    def generate_token(user_id: int, username: str, roles: List[str], 
                      expires_in_minutes: int = 60) -> str:
        """
        Generate a JWT token for the user.
        
        Args:
            user_id: The user ID
            username: The username
            roles: List of user roles
            expires_in_minutes: Token validity period in minutes
            
        Returns:
            A signed JWT token string
        """
        payload = {
            'sub': user_id,
            'username': username,
            'roles': roles,
            'iat': int(time.time()),
            'exp': int(time.time() + expires_in_minutes * 60)
        }
        
        try:
            token = jwt.encode(
                payload, 
                config.SECRET_KEY,
                algorithm='HS256'
            )
            logger.debug(f"Generated token for user {username}")
            return token
        except Exception as e:
            logger.error(f"Error generating token: {str(e)}")
            raise AuthError("Failed to generate authentication token")

    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """
        Decode and validate a JWT token.
        
        Args:
            token: The JWT token string
            
        Returns:
            The decoded token payload
            
        Raises:
            AuthError: If the token is invalid or expired
        """
        try:
            payload = jwt.decode(
                token,
                config.SECRET_KEY,
                algorithms=['HS256']
            )
            logger.debug(f"Decoded token for user {payload.get('username', 'unknown')}")
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Authentication failed: Token expired")
            raise AuthError("Token has expired", 401)
        except jwt.InvalidTokenError as e:
            logger.warning(f"Authentication failed: Invalid token - {str(e)}")
            raise AuthError("Invalid authentication token", 401)
        except Exception as e:
            logger.error(f"Unexpected error decoding token: {str(e)}")
            raise AuthError("Failed to process authentication token", 500)

    @staticmethod
    def check_permissions(required_roles: List[str], token_payload: Dict[str, Any]) -> bool:
        """
        Check if the user has the required roles.
        
        Args:
            required_roles: List of roles required for the action
            token_payload: The decoded token payload
            
        Returns:
            True if user has permission, False otherwise
        """
        user_roles = token_payload.get('roles', [])
        
        # Super admin role has all permissions
        if 'admin' in user_roles:
            return True
            
        # Check if the user has any of the required roles
        return any(role in user_roles for role in required_roles)

    @classmethod
    def validate_and_get_user(cls, token: str, required_roles: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Validate token and check permissions.
        
        Args:
            token: The JWT token string
            required_roles: Optional list of roles required for the action
            
        Returns:
            The user information from the token payload
            
        Raises:
            AuthError: If authentication or authorization fails
        """
        payload = cls.decode_token(token)
        
        if required_roles and not cls.check_permissions(required_roles, payload):
            username = payload.get('username', 'unknown')
            logger.warning(f"Authorization failed: User {username} lacks required roles")
            raise AuthError("Insufficient permissions", 403)
            
        return {
            'user_id': payload.get('sub'),
            'username': payload.get('username'),
            'roles': payload.get('roles', [])
        }

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password for secure storage.
        
        Args:
            password: The plain text password
            
        Returns:
            Hashed password string
        """
        import hashlib
        import os
        
        # In a real application, use a proper password hashing library like bcrypt
        salt = os.urandom(32)
        pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return salt.hex() + pwdhash.hex()

    @staticmethod
    def verify_password(stored_password: str, provided_password: str) -> bool:
        """
        Verify a password against its stored hash.
        
        Args:
            stored_password: The hashed password from storage
            provided_password: The plain text password to verify
            
        Returns:
            True if the password matches, False otherwise
        """
        import hashlib
        import os
        
        # In a real application, use a proper password hashing library like bcrypt
        salt = bytes.fromhex(stored_password[:64])
        stored_hash = stored_password[64:]
        pwdhash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, 100000)
        
        return pwdhash.hex() == stored_hash