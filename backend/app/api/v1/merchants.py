from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import (
    get_current_user,
    get_current_merchant,
    require_merchant_owner,
    require_merchant_admin,
)
from backend.app.models.user import User, MerchantProfile, MerchantMember, MerchantSetting
from backend.app.models.paypal import PayPalConnection
from backend.app.models.audit import AuditLog
from backend.app.schemas.merchant import (
    MerchantCreate,
    MerchantUpdate,
    MerchantResponse,
    MerchantMemberResponse,
    MerchantMemberCreate,
    MerchantMemberUpdate,
    MerchantSettingResponse,
    MerchantSettingUpdate,
)

router = APIRouter(prefix="/merchants", tags=["Merchants"])

def get_merchant_response(merchant: MerchantProfile, role: str, db: Session) -> MerchantResponse:
    paypal_conn = db.query(PayPalConnection).filter(
        PayPalConnection.merchant_id == merchant.id
    ).first()
    is_paypal_connected = bool(paypal_conn and paypal_conn.is_connected)

    return MerchantResponse(
        id=merchant.id,
        business_name=merchant.business_name,
        business_category=merchant.business_category,
        category=merchant.business_category,
        country=merchant.country,
        currency=merchant.currency,
        description=merchant.description,
        role=role,
        is_paypal_connected=is_paypal_connected,
        created_at=merchant.created_at
    )

@router.post("/onboarding", response_model=MerchantResponse, status_code=status.HTTP_201_CREATED)
def onboard_merchant(
    data: MerchantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new isolated business profile for the registered user with zero mock values.
    Initializes default merchant settings and links user as OWNER.
    """
    # Compose description with contact info if provided
    desc = data.description
    extra_details = []
    if data.address:
        extra_details.append(f"Address: {data.address.strip()}")
    if data.phone:
        extra_details.append(f"Phone: {data.phone.strip()}")
    if extra_details:
        contact_str = " | ".join(extra_details)
        desc = f"{desc}\n{contact_str}".strip() if desc else contact_str

    merchant = MerchantProfile(
        business_name=data.business_name.strip(),
        business_category=data.business_category.strip(),
        country=data.country.upper().strip(),
        currency=data.currency.upper().strip(),
        description=desc
    )
    db.add(merchant)
    db.flush()

    # Assign user as explicit OWNER
    member = MerchantMember(
        merchant_id=merchant.id,
        user_id=current_user.id,
        role="OWNER"
    )
    db.add(member)

    # Initialize default merchant settings
    setting = MerchantSetting(
        merchant_id=merchant.id,
        auto_reorder_enabled=False,
        default_safety_stock=10,
        default_lead_time_days=7
    )
    db.add(setting)

    # Audit log
    audit = AuditLog(
        merchant_id=merchant.id,
        user_id=current_user.id,
        action="MERCHANT_CREATED",
        resource_type="MERCHANT",
        resource_id=merchant.id,
        details_json=f'{{"business_name": "{merchant.business_name}", "currency": "{merchant.currency}"}}'
    )
    db.add(audit)

    db.commit()
    db.refresh(merchant)

    return get_merchant_response(merchant, role="OWNER", db=db)

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
    role = member.role if member else "VIEWER"

    return get_merchant_response(current_merchant, role=role, db=db)

@router.put("/me", response_model=MerchantResponse)
def update_merchant_profile(
    update_data: MerchantUpdate,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_member: MerchantMember = Depends(require_merchant_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if update_data.business_name:
        current_merchant.business_name = update_data.business_name.strip()
    if update_data.business_category:
        current_merchant.business_category = update_data.business_category.strip()
    if update_data.country:
        current_merchant.country = update_data.country.upper().strip()
    if update_data.currency:
        current_merchant.currency = update_data.currency.upper().strip()
    if update_data.description is not None:
        current_merchant.description = update_data.description.strip()

    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id,
        action="MERCHANT_UPDATED",
        resource_type="MERCHANT",
        resource_id=current_merchant.id,
        details_json=f'{{"business_name": "{current_merchant.business_name}"}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(current_merchant)

    return get_merchant_response(current_merchant, role=current_member.role, db=db)

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
            results.append(get_merchant_response(merchant, role=m.role, db=db))
    return results

# --- Multi-User Collaboration & Role Management ---

@router.get("/me/members", response_model=List[MerchantMemberResponse])
def list_merchant_members(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    members = db.query(MerchantMember).filter(
        MerchantMember.merchant_id == current_merchant.id
    ).all()

    results = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            results.append(MerchantMemberResponse(
                id=m.id,
                merchant_id=m.merchant_id,
                user_id=m.user_id,
                email=user.email,
                full_name=user.full_name,
                role=m.role,
                created_at=m.created_at
            ))
    return results

@router.post("/me/members", response_model=MerchantMemberResponse, status_code=status.HTTP_201_CREATED)
def add_merchant_member(
    member_in: MerchantMemberCreate,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_member: MerchantMember = Depends(require_merchant_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    normalized_email = member_in.email.lower().strip()
    target_user = db.query(User).filter(User.email == normalized_email).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email was not found. The user must register an account first."
        )

    # Check if user is already a member
    existing = db.query(MerchantMember).filter(
        MerchantMember.merchant_id == current_merchant.id,
        MerchantMember.user_id == target_user.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is already a member of this merchant workspace."
        )

    role_upper = member_in.role.upper().strip()
    if role_upper not in ["ADMIN", "ANALYST", "VIEWER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be ADMIN, ANALYST, or VIEWER."
        )

    new_member = MerchantMember(
        merchant_id=current_merchant.id,
        user_id=target_user.id,
        role=role_upper
    )
    db.add(new_member)

    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id,
        action="MEMBER_ADDED",
        resource_type="MERCHANT_MEMBER",
        resource_id=new_member.id,
        details_json=f'{{"invited_email": "{target_user.email}", "role": "{role_upper}"}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(new_member)

    return MerchantMemberResponse(
        id=new_member.id,
        merchant_id=new_member.merchant_id,
        user_id=new_member.user_id,
        email=target_user.email,
        full_name=target_user.full_name,
        role=new_member.role,
        created_at=new_member.created_at
    )

@router.put("/me/members/{member_id}", response_model=MerchantMemberResponse)
def update_member_role(
    member_id: str,
    update_in: MerchantMemberUpdate,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_member: MerchantMember = Depends(require_merchant_owner),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_member = db.query(MerchantMember).filter(
        MerchantMember.id == member_id,
        MerchantMember.merchant_id == current_merchant.id
    ).first()
    if not target_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member record not found.")

    new_role = update_in.role.upper().strip()
    if new_role not in ["OWNER", "ADMIN", "ANALYST", "VIEWER"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role specification.")

    # Guard against removing the last owner
    if target_member.role == "OWNER" and new_role != "OWNER":
        owner_count = db.query(MerchantMember).filter(
            MerchantMember.merchant_id == current_merchant.id,
            MerchantMember.role == "OWNER"
        ).count()
        if owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the only OWNER of the merchant workspace."
            )

    target_member.role = new_role
    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id,
        action="MEMBER_ROLE_UPDATED",
        resource_type="MERCHANT_MEMBER",
        resource_id=target_member.id,
        details_json=f'{{"new_role": "{new_role}"}}'
    )
    db.add(audit)
    db.commit()

    user = db.query(User).filter(User.id == target_member.user_id).first()
    return MerchantMemberResponse(
        id=target_member.id,
        merchant_id=target_member.merchant_id,
        user_id=target_member.user_id,
        email=user.email if user else "",
        full_name=user.full_name if user else "",
        role=target_member.role,
        created_at=target_member.created_at
    )

@router.delete("/me/members/{member_id}")
def remove_merchant_member(
    member_id: str,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_member: MerchantMember = Depends(require_merchant_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_member = db.query(MerchantMember).filter(
        MerchantMember.id == member_id,
        MerchantMember.merchant_id == current_merchant.id
    ).first()
    if not target_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member record not found.")

    # Only OWNER can remove an OWNER
    if target_member.role == "OWNER":
        if current_member.role != "OWNER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only an OWNER can remove another OWNER."
            )
        owner_count = db.query(MerchantMember).filter(
            MerchantMember.merchant_id == current_merchant.id,
            MerchantMember.role == "OWNER"
        ).count()
        if owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the only OWNER of the merchant workspace."
            )

    db.delete(target_member)
    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id,
        action="MEMBER_REMOVED",
        resource_type="MERCHANT_MEMBER",
        resource_id=member_id,
        details_json=f'{{"removed_user_id": "{target_member.user_id}"}}'
    )
    db.add(audit)
    db.commit()

    return {"message": "Member successfully removed from merchant workspace."}

# --- Merchant Settings Management ---

@router.get("/me/settings", response_model=MerchantSettingResponse)
def get_merchant_settings(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    setting = db.query(MerchantSetting).filter(
        MerchantSetting.merchant_id == current_merchant.id
    ).first()
    if not setting:
        setting = MerchantSetting(
            merchant_id=current_merchant.id,
            auto_reorder_enabled=False,
            default_safety_stock=10,
            default_lead_time_days=7
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

@router.put("/me/settings", response_model=MerchantSettingResponse)
def update_merchant_settings(
    settings_in: MerchantSettingUpdate,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_member: MerchantMember = Depends(require_merchant_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    setting = db.query(MerchantSetting).filter(
        MerchantSetting.merchant_id == current_merchant.id
    ).first()
    if not setting:
        setting = MerchantSetting(merchant_id=current_merchant.id)
        db.add(setting)

    if settings_in.auto_reorder_enabled is not None:
        setting.auto_reorder_enabled = settings_in.auto_reorder_enabled
    if settings_in.default_safety_stock is not None:
        setting.default_safety_stock = settings_in.default_safety_stock
    if settings_in.default_lead_time_days is not None:
        setting.default_lead_time_days = settings_in.default_lead_time_days

    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id,
        action="SETTINGS_UPDATED",
        resource_type="MERCHANT_SETTING",
        resource_id=setting.id,
        details_json=f'{{"auto_reorder": {setting.auto_reorder_enabled}, "safety_stock": {setting.default_safety_stock}}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(setting)
    return setting
