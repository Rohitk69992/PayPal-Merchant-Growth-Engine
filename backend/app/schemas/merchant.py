from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class MerchantCreate(BaseModel):
    business_name: str = Field(min_length=2, max_length=255)
    business_category: str = Field(default="General Retail", max_length=100)
    country: str = Field(default="USA", min_length=2, max_length=3)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    description: Optional[str] = None

class MerchantUpdate(BaseModel):
    business_name: Optional[str] = None
    business_category: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    description: Optional[str] = None

class MerchantResponse(BaseModel):
    id: str
    business_name: str
    business_category: str
    country: str
    currency: str
    description: Optional[str] = None
    role: str = "OWNER"
    is_paypal_connected: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
