from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Minimum 8 characters")
    full_name: str = Field(min_length=2, max_length=150)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    id_token: str = Field(..., description="Google OpenID Connect ID token issued by Google Sign-In")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=16, description="Secure password reset token")
    new_password: str = Field(..., min_length=8, description="Minimum 8 characters")

class EmailVerificationRequest(BaseModel):
    token: str = Field(..., min_length=16, description="Email verification token")

class AccountDeactivateRequest(BaseModel):
    password: str = Field(..., description="Current password to confirm account deactivation")
    confirmation: str = Field(..., description="Must type 'DEACTIVATE' to confirm")

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_verified: bool = False
    has_merchant: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    session_id: Optional[str] = None

class UserSessionResponse(BaseModel):
    id: str
    user_id: str
    session_token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: datetime
    is_revoked: bool
    created_at: datetime
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)

class AuthEventResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    email_attempted: str
    event_type: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
    reset_token: Optional[str] = None
