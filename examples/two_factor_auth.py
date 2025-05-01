"""
Example module demonstrating how to implement 2FA in a FastAPI application
"""
from datetime import timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

from packagescore.security import (
    verify_password, get_password_hash, create_access_token,
    generate_totp_secret, get_totp_uri, verify_totp, generate_recovery_codes,
    encrypt_data, decrypt_data
)

# This would typically be stored in a database
USERS_DB = {
    "testuser": {
        "username": "testuser",
        "full_name": "Test User",
        "email": "test@example.com",
        "hashed_password": get_password_hash("password123"),
        "disabled": False,
        "mfa_enabled": False,
        "mfa_secret": None,
        "recovery_codes": []
    }
}

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic models
class User(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    disabled: Optional[bool] = None
    mfa_enabled: bool = False

class UserInDB(User):
    hashed_password: str
    mfa_secret: Optional[str] = None
    recovery_codes: List[str] = []

class Token(BaseModel):
    access_token: str
    token_type: str
    requires_mfa: bool = False
    mfa_token: Optional[str] = None

class MFAToken(BaseModel):
    mfa_token: str

class MFAVerify(BaseModel):
    mfa_token: str
    totp_code: str

class RecoveryCodes(BaseModel):
    recovery_codes: List[str]

class MFASetupResponse(BaseModel):
    secret: str
    uri: str
    qr_code: str  # Base64 encoded QR code image (would be implemented in real app)
    recovery_codes: List[str]

# Utility functions
def get_user(db, username: str) -> Optional[UserInDB]:
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None

def authenticate_user(db, username: str, password: str) -> Optional[UserInDB]:
    user = get_user(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

# Create router
router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login endpoint that handles both normal and MFA authentication flows"""
    user = authenticate_user(USERS_DB, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user has MFA enabled
    if user.mfa_enabled:
        # For MFA users, we don't issue an access token yet
        # Instead, we issue a temporary MFA token
        mfa_data = {
            "sub": user.username,
            "mfa_pending": True
        }
        mfa_token = create_access_token(
            data=mfa_data,
            expires_delta=timedelta(minutes=5)  # Short expiration for MFA
        )
        
        # Return token that indicates MFA is required
        return {
            "access_token": "",  # No access token yet
            "token_type": "bearer",
            "requires_mfa": True,
            "mfa_token": mfa_token
        }
    
    # For non-MFA users, issue a regular access token
    access_token = create_access_token(
        data={"sub": user.username}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "requires_mfa": False
    }

@router.post("/verify-mfa", response_model=Token)
async def verify_mfa_code(data: MFAVerify):
    """Verify the TOTP code and issue an access token if valid"""
    try:
        # In a real app, you'd decode the token and verify it's a valid MFA token
        # For simplicity, we're using a dummy implementation here
        username = "testuser"  # Would be extracted from the MFA token
        
        user = get_user(USERS_DB, username)
        if not user or not user.mfa_enabled or not user.mfa_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA token",
            )
        
        # Verify the TOTP code
        if not verify_totp(user.mfa_secret, data.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid TOTP code",
            )
        
        # If valid, issue an access token
        access_token = create_access_token(
            data={"sub": user.username}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "requires_mfa": False
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA verification",
        )

@router.post("/setup-mfa", response_model=MFASetupResponse)
async def setup_mfa(username: str):
    """Set up MFA for a user"""
    user = get_user(USERS_DB, username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Generate a new TOTP secret
    secret = generate_totp_secret()
    
    # Generate the URI for QR code
    uri = get_totp_uri(secret, user.email, "YourAppName")
    
    # Generate recovery codes
    recovery_codes = generate_recovery_codes(10)
    
    # In a real app, you would update the user in the database
    # For this example, we'll update our in-memory DB
    USERS_DB[username]["mfa_secret"] = secret
    USERS_DB[username]["recovery_codes"] = recovery_codes
    
    # In a real app, you would generate a QR code image
    # For this example, we'll just return a placeholder
    qr_code = "base64_encoded_qr_code_would_go_here"
    
    return {
        "secret": secret,
        "uri": uri,
        "qr_code": qr_code,
        "recovery_codes": recovery_codes
    }

@router.post("/enable-mfa")
async def enable_mfa(username: str, totp_code: str):
    """Enable MFA for a user after verifying the setup"""
    user = get_user(USERS_DB, username)
    if not user or not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup not completed",
        )
    
    # Verify the TOTP code to ensure setup was successful
    if not verify_totp(user.mfa_secret, totp_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid TOTP code",
        )
    
    # Enable MFA for the user
    USERS_DB[username]["mfa_enabled"] = True
    
    return {"message": "MFA enabled successfully"}

@router.post("/disable-mfa")
async def disable_mfa(username: str, totp_code: str):
    """Disable MFA for a user"""
    user = get_user(USERS_DB, username)
    if not user or not user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA not enabled",
        )
    
    # Verify the TOTP code
    if not verify_totp(user.mfa_secret, totp_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid TOTP code",
        )
    
    # Disable MFA and clear MFA data
    USERS_DB[username]["mfa_enabled"] = False
    USERS_DB[username]["mfa_secret"] = None
    USERS_DB[username]["recovery_codes"] = []
    
    return {"message": "MFA disabled successfully"}

@router.post("/mfa-recovery")
async def mfa_recovery(username: str, recovery_code: str):
    """Use a recovery code to get access when MFA device is unavailable"""
    user = get_user(USERS_DB, username)
    if not user or not user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA not enabled",
        )
    
    # Check if the recovery code is valid
    if recovery_code not in user.recovery_codes:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid recovery code",
        )
    
    # Remove the used recovery code
    USERS_DB[username]["recovery_codes"].remove(recovery_code)
    
    # Issue an access token
    access_token = create_access_token(
        data={"sub": user.username}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Recovery successful. Please set up MFA again."
    }