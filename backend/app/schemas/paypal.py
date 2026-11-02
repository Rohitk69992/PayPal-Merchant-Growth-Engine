from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr

class PayPalConnectRequest(BaseModel):
    client_id: str = Field(min_length=10)
    client_secret: str = Field(min_length=10)
    environment: str = Field(default="sandbox", pattern="^(sandbox|live)$")

class PayPalStatusResponse(BaseModel):
    is_configured: bool
    environment: str
    client_id_preview: Optional[str] = None
    is_connected: bool
    webhook_id: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    mode: str = "MODE_B_MERCHANT_CONNECT"  # or MODE_A_TEAM_SANDBOX
    consent_status: Optional[str] = "GRANTED"
    partner_onboarding_url: Optional[str] = None

class SimulatePaymentRequest(BaseModel):
    amount: float = Field(gt=0.0)
    description: Optional[str] = None
    product_sku: Optional[str] = None
    product_id: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = None

class PayPalSyncResponse(BaseModel):
    job_id: str
    status: str
    records_synced: int
    message: str
