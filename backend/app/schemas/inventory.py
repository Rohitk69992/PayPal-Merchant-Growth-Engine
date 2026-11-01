from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class StockAdjustment(BaseModel):
    product_id: str
    adjustment_units: int = Field(description="Can be positive (restock) or negative (shrinkage/damage)")
    reason: str = Field(default="Manual stock adjustment", max_length=255)

class InventoryMovementResponse(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    sku: Optional[str] = None
    movement_type: str  # INITIAL, SALE, RESTOCK, ADJUSTMENT, RETURN
    quantity: int
    stock_after: int
    reason: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderCreate(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)
    supplier_name: Optional[str] = None

class PurchaseOrderResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    sku: str
    quantity: int
    unit_cost: float
    total_amount: float
    supplier_name: str
    status: str  # DRAFT, SUBMITTED, RECEIVED, CANCELLED
    created_at: datetime
    received_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ReorderRecommendationResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    sku: str
    current_stock: int
    safety_stock: int
    lead_time_days: int
    recommended_quantity: int
    reasoning: str
    urgency: str  # LOW, MEDIUM, HIGH, CRITICAL
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
