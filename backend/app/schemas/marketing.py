from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CampaignDraftCreate(BaseModel):
    target_segment: str
    headline: str = Field(min_length=5, max_length=255)
    email_subject: str = Field(min_length=5, max_length=255)
    body_copy: str = Field(min_length=10)
    discount_code: str = Field(min_length=3, max_length=64)
    discount_pct: float = Field(ge=0.0, le=100.0)

class CampaignResponse(BaseModel):
    id: str
    target_segment: str
    headline: str
    email_subject: str
    body_copy: str
    discount_code: str
    discount_pct: float
    estimated_reach: int
    expected_conversion_rate: float
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
