from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator

class MerchantCreate(BaseModel):
    business_name: str = Field(min_length=2, max_length=255)
    business_category: Optional[str] = Field(default=None, max_length=100)
    category: Optional[str] = Field(default=None, max_length=100)  # Frontend alias
    country: str = Field(default="USA", min_length=2, max_length=3)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None

    @model_validator(mode="after")
    def resolve_category(self):
        if not self.business_category and self.category:
            self.business_category = self.category
        elif not self.business_category:
            self.business_category = "General Retail"
        return self

class MerchantUpdate(BaseModel):
    business_name: Optional[str] = None
    business_category: Optional[str] = None
    category: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    description: Optional[str] = None

    @model_validator(mode="after")
    def resolve_category(self):
        if not self.business_category and self.category:
            self.business_category = self.category
        return self

class MerchantResponse(BaseModel):
    id: str
    business_name: str
    business_category: str
    category: Optional[str] = None  # Compatible with frontend
    country: str
    currency: str
    description: Optional[str] = None
    role: str = "OWNER"
    is_paypal_connected: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MerchantMemberResponse(BaseModel):
    id: str
    merchant_id: str
    user_id: str
    email: str
    full_name: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MerchantMemberCreate(BaseModel):
    email: EmailStr
    role: str = Field(default="ANALYST", description="ADMIN, ANALYST, or VIEWER")

class MerchantMemberUpdate(BaseModel):
    role: str = Field(..., description="OWNER, ADMIN, ANALYST, or VIEWER")

class MerchantSettingResponse(BaseModel):
    id: str
    merchant_id: str
    auto_reorder_enabled: bool
    default_safety_stock: int
    default_lead_time_days: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MerchantSettingUpdate(BaseModel):
    auto_reorder_enabled: Optional[bool] = None
    default_safety_stock: Optional[int] = Field(None, ge=0)
    default_lead_time_days: Optional[int] = Field(None, ge=1)
