from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, get_current_merchant
from backend.app.models.user import User, MerchantProfile, MerchantMember
from backend.app.models.paypal import PayPalConnection
from backend.app.schemas.merchant import MerchantCreate, MerchantUpdate, MerchantResponse

router = APIRouter(prefix="/merchants", tags=["Merchants"])

@router.post("/onboarding", response_model=MerchantResponse, status_code=status.HTTP_201_CREATED)
def onboard_merchant(
    data: MerchantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new isolated business profile for the registered user.
    """
    merchant = MerchantProfile(
        business_name=data.business_name.strip(),
        business_category=data.business_category.strip(),
        country=data.country.upper(),
        currency=data.currency.upper(),
        description=data.description
    )
    db.add(merchant)
    db.flush()

    # Assign user as OWNER
    member = MerchantMember(
        merchant_id=merchant.id,
        user_id=current_user.id,
        role="OWNER"
    )
    db.add(member)
    db.commit()
    db.refresh(merchant)

    return MerchantResponse(
        id=merchant.id,
        business_name=merchant.business_name,
        business_category=merchant.business_category,
        country=merchant.country,
        currency=merchant.currency,
        description=merchant.description,
        role="OWNER",
        is_paypal_connected=False,
        created_at=merchant.created_at
    )

@router.get("/me", response_model=MerchantResponse)
def get_current_merchant_profile(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    member = db.query(MerchantMember).filter(
        MerchantMember.merchant_id == current_merchant.id,
        MerchantMember.user_id == current_user.id
    ).first()
    role = member.role if member else "MEMBER"

    paypal_conn = db.query(PayPalConnection).filter(
        PayPalConnection.merchant_id == current_merchant.id
    ).first()
    is_paypal_connected = bool(paypal_conn and paypal_conn.is_connected)

    return MerchantResponse(
        id=current_merchant.id,
        business_name=current_merchant.business_name,
        business_category=current_merchant.business_category,
        country=current_merchant.country,
        currency=current_merchant.currency,
        description=current_merchant.description,
        role=role,
        is_paypal_connected=is_paypal_connected,
        created_at=current_merchant.created_at
    )

@router.put("/me", response_model=MerchantResponse)
def update_merchant_profile(
    update_data: MerchantUpdate,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    if update_data.business_name:
        current_merchant.business_name = update_data.business_name.strip()
    if update_data.business_category:
        current_merchant.business_category = update_data.business_category.strip()
    if update_data.country:
        current_merchant.country = update_data.country.upper()
    if update_data.currency:
        current_merchant.currency = update_data.currency.upper()
    if update_data.description is not None:
        current_merchant.description = update_data.description

    db.commit()
    db.refresh(current_merchant)

    return MerchantResponse(
        id=current_merchant.id,
        business_name=current_merchant.business_name,
        business_category=current_merchant.business_category,
        country=current_merchant.country,
        currency=current_merchant.currency,
        description=current_merchant.description,
        role="OWNER",
        is_paypal_connected=False,
        created_at=current_merchant.created_at
    )

@router.get("/my-merchants", response_model=List[MerchantResponse])
def get_user_merchants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(MerchantMember).filter(MerchantMember.user_id == current_user.id).all()
    results = []
    for m in memberships:
        merchant = db.query(MerchantProfile).filter(MerchantProfile.id == m.merchant_id).first()
        if merchant:
            results.append(MerchantResponse(
                id=merchant.id,
                business_name=merchant.business_name,
                business_category=merchant.business_category,
                country=merchant.country,
                currency=merchant.currency,
                description=merchant.description,
                role=m.role,
                is_paypal_connected=False,
                created_at=merchant.created_at
            ))
    return results
