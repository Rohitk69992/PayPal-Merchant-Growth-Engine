from typing import Optional, Tuple
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token
from backend.app.models.user import User, UserSession, MerchantProfile, MerchantMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Enforce session validation if session_id is embedded
    sid: Optional[str] = payload.get("sid")
    if sid:
        session_record = db.query(UserSession).filter(UserSession.id == sid).first()
        if not session_record or session_record.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked or logged out.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        expires_at = session_record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_token_payload(
    token: Optional[str] = Depends(oauth2_scheme)
) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None
    payload = decode_access_token(token)
    if payload is None:
        return None
    user_id: str = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id, User.is_active == True).first()

def get_current_merchant(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_merchant_id: Optional[str] = Header(None)
) -> MerchantProfile:
    """
    Enforces multi-tenant authorization.
    Verifies that the authenticated user has explicit membership in the target merchant.
    """
    if x_merchant_id:
        membership = db.query(MerchantMember).filter(
            MerchantMember.merchant_id == x_merchant_id,
            MerchantMember.user_id == current_user.id
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this merchant's data."
            )
        merchant = db.query(MerchantProfile).filter(MerchantProfile.id == x_merchant_id).first()
        if not merchant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found.")
        return merchant

    # Default to user's first active merchant membership
    membership = db.query(MerchantMember).filter(MerchantMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant onboarding required. Please create a merchant profile."
        )

    merchant = db.query(MerchantProfile).filter(MerchantProfile.id == membership.merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found.")
    return merchant

def check_merchant_role(
    required_roles: list,
    current_merchant: MerchantProfile,
    current_user: User,
    db: Session
) -> MerchantMember:
    member = db.query(MerchantMember).filter(
        MerchantMember.merchant_id == current_merchant.id,
        MerchantMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this merchant."
        )
    if member.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required role: {', '.join(required_roles)}. Your role is: {member.role}."
        )
    return member

def require_merchant_owner(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> MerchantMember:
    return check_merchant_role(["OWNER"], current_merchant, current_user, db)

def require_merchant_admin(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> MerchantMember:
    return check_merchant_role(["OWNER", "ADMIN"], current_merchant, current_user, db)

