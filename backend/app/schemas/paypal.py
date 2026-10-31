from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

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

class SimulatePaymentRequest(BaseModel):
    amount: float = Field(default=49.99, gt=0.0)
    description: Optional[str] = "Online Store Purchase"
    product_sku: Optional[str] = None
    product_id: Optional[str] = None
    customer_email: str = Field(default="customer@buyer.com")
    customer_name: str = Field(default="Jane Shopper")
