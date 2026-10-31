from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token
from backend.app.models.user import User, MerchantProfile, MerchantMember

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

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if user is None:
        raise credentials_exception
    return user

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
