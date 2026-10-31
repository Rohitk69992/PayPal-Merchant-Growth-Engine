from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_merchant
from backend.app.models.user import MerchantProfile
from backend.app.models.marketing import MarketingCampaign
from backend.app.models.transaction import Customer
from backend.app.schemas.marketing import CampaignDraftCreate, CampaignResponse

router = APIRouter(prefix="/marketing", tags=["Marketing"])

@router.get("/campaigns", response_model=List[CampaignResponse])
def list_campaigns(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    campaigns = db.query(MarketingCampaign).filter(
        MarketingCampaign.merchant_id == current_merchant.id
    ).order_by(MarketingCampaign.created_at.desc()).all()

    return campaigns

@router.post("/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    draft: CampaignDraftCreate,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    # Calculate reach based on real customer records
    customer_count = db.query(Customer).filter(Customer.merchant_id == current_merchant.id).count()
    reach = max(1, customer_count)

    campaign = MarketingCampaign(
        merchant_id=current_merchant.id,
        target_segment=draft.target_segment,
        headline=draft.headline,
        email_subject=draft.email_subject,
        body_copy=draft.body_copy,
        discount_code=draft.discount_code.upper(),
        discount_pct=draft.discount_pct,
        estimated_reach=reach,
        expected_conversion_rate=5.5,
        status="DRAFT"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return campaign

@router.put("/campaigns/{campaign_id}/activate", response_model=CampaignResponse)
def activate_campaign(
    campaign_id: str,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    campaign = db.query(MarketingCampaign).filter(
        MarketingCampaign.id == campaign_id,
        MarketingCampaign.merchant_id == current_merchant.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    campaign.status = "ACTIVE"
    db.commit()
    db.refresh(campaign)

    return campaign
