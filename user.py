from datetime import datetime
from typing import List, Dict, Optional, Union, Any, ClassVar
from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
import uuid

from database import db
from logger import Logger
from auth import Auth

logger = Logger.get_logger(__name__)

class UserModel:
    """User database model for handling database operations related to users."""
    
    TABLE_NAME = "users"
    TABLE_SCHEMA = f"""
    CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        roles TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """
    
    @classmethod
    def initialize(cls) -> None:
        """Initialize the user table in the database."""
        db.create_tables_if_not_exists({cls.TABLE_NAME: cls.TABLE_SCHEMA})
    
    @classmethod
    def get_by_id(cls, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a user by ID.
        
        Args:
            user_id: The user's ID
            
        Returns:
            User data as a dictionary or None if not found
        """
        query = f"SELECT * FROM {cls.TABLE_NAME} WHERE id = ? AND is_active = 1"
        results = db.execute_query(query, (user_id,))
        return results[0] if results else None
    
    @classmethod
    def get_by_username(cls, username: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a user by username.
        
        Args:
            username: The username to search for
            
        Returns:
            User data as a dictionary or None if not found
        """
        query = f"SELECT * FROM {cls.TABLE_NAME} WHERE username = ? AND is_active = 1"
        results = db.execute_query(query, (username,))
        return results[0] if results else None
        
    @classmethod
    def get_by_email(cls, email: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a user by email.
        
        Args:
            email: The email to search for
            
        Returns:
            User data as a dictionary or None if not found
        """
        query = f"SELECT * FROM {cls.TABLE_NAME} WHERE email = ? AND is_active = 1"
        results = db.execute_query(query, (email,))
        return results[0] if results else None
        
    @classmethod
    def create(cls, user_data: Dict[str, Any]) -> int:
        """
        Create a new user.
        
        Args:
            user_data: Dictionary with user data
            
        Returns:
            ID of the created user
            
        Raises:
            Exception: If user creation fails
        """
        # Ensure password is hashed
        if 'password' in user_data and 'password_hash' not in user_data:
            user_data['password_hash'] = Auth.hash_password(user_data.pop('password'))
        
        # Convert roles list to comma-separated string if needed
        if isinstance(user_data.get('roles'), list):
            user_data['roles'] = ','.join(user_data['roles'])
        
        columns = ', '.join(user_data.keys())
        placeholders = ', '.join(['?'] * len(user_data))
        
        query = f"INSERT INTO {cls.TABLE_NAME} ({columns}) VALUES ({placeholders})"
        
        try:
            with db.get_cursor() as cursor:
                cursor.execute(query, tuple(user_data.values()))
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            raise
    
    @classmethod
    def update(cls, user_id: int, user_data: Dict[str, Any]) -> bool:
        """
        Update user data.
        
        Args:
            user_id: The ID of the user to update
            user_data: Dictionary with user data to update
            
        Returns:
            True if successful, False otherwise
        """
        # Don't allow direct password_hash updates
        if 'password' in user_data:
            user_data['password_hash'] = Auth.hash_password(user_data.pop('password'))
        
        # Convert roles list to comma-separated string if needed
        if isinstance(user_data.get('roles'), list):
            user_data['roles'] = ','.join(user_data['roles'])
        
        # Add updated_at timestamp
        user_data['updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        set_clause = ', '.join([f"{column} = ?" for column in user_data.keys()])
        query = f"UPDATE {cls.TABLE_NAME} SET {set_clause} WHERE id = ?"
        
        try:
            values = list(user_data.values())
            values.append(user_id)
            return db.execute_update(query, tuple(values)) > 0
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {str(e)}")
            return False
    
    @classmethod
    def delete(cls, user_id: int) -> bool:
        """
        Soft delete a user (mark as inactive).
        
        Args:
            user_id: The ID of the user to delete
            
        Returns:
            True if successful, False otherwise
        """
        query = f"UPDATE {cls.TABLE_NAME} SET is_active = 0, updated_at = ? WHERE id = ?"
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        try:
            return db.execute_update(query, (now, user_id)) > 0
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {str(e)}")
            return False
    
    @classmethod
    def list_users(cls, skip: int = 0, limit: int = 100, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """
        List users with pagination.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            include_inactive: Whether to include inactive users
            
        Returns:
            List of user dictionaries
        """
        query = f"SELECT * FROM {cls.TABLE_NAME}"
        if not include_inactive:
            query += " WHERE is_active = 1"
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        
        return db.execute_query(query, (limit, skip))


# Pydantic schemas for API requests and responses

class UserBase(BaseModel):
    """Base model with common user attributes."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=100)
    
    @field_validator('username')
    @classmethod
    def username_must_be_valid(cls, v):
        if not v.isalnum() and '_' not in v and '-' not in v:
            raise ValueError('Username must contain only alphanumeric characters, underscores, or hyphens')
        return v


class UserCreate(UserBase):
    """Schema for user creation requests."""
    password: str = Field(..., min_length=8)
    roles: List[str] = Field(default_factory=lambda: ["user"])


class UserUpdate(BaseModel):
    """Schema for user update requests."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)
    roles: Optional[List[str]] = None
    is_active: Optional[bool] = None
    
    @field_validator('username')
    @classmethod
    def username_must_be_valid(cls, v):
        if v is not None and not v.isalnum() and '_' not in v and '-' not in v:
            raise ValueError('Username must contain only alphanumeric characters, underscores, or hyphens')
        return v


class UserResponse(UserBase):
    """Schema for user responses."""
    id: int
    roles: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """Schema for user login requests."""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Schema for token responses."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse