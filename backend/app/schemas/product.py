from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator

class ProductCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=255)
    category: str = Field(default="General", max_length=100)
    unit_cost: float = Field(default=0.0, ge=0.0)
    selling_price: float = Field(default=0.0, gt=0.0)
    current_stock: int = Field(default=0, ge=0)
    safety_stock: int = Field(default=10, ge=0)
    lead_time_days: int = Field(default=7, ge=1)
    supplier_name: str = Field(default="Direct Supplier", max_length=255)

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any):
        if isinstance(data, dict):
            if "unit_price" in data and "selling_price" not in data:
                data["selling_price"] = data["unit_price"]
            if "stock_on_hand" in data and "current_stock" not in data:
                data["current_stock"] = data["stock_on_hand"]
        return data

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit_cost: Optional[float] = Field(None, ge=0.0)
    selling_price: Optional[float] = Field(None, gt=0.0)
    safety_stock: Optional[int] = Field(None, ge=0)
    lead_time_days: Optional[int] = Field(None, ge=1)
    supplier_name: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: str
    sku: str
    name: str
    category: str
    unit_cost: float
    selling_price: float
    current_stock: int
    safety_stock: int
    lead_time_days: int
    supplier_name: str
    is_active: bool
    status: str  # IN_STOCK, LOW_STOCK, OUT_OF_STOCK
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DailySaleCreate(BaseModel):
    product_id: str
    sales_date: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    units_sold: int = Field(gt=0)
    revenue: Optional[float] = None  # Auto-calculated from product selling_price if omitted
    channel: Optional[str] = "PAYPAL_CHECKOUT"

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any):
        if isinstance(data, dict):
            if "date" in data and "sales_date" not in data:
                data["sales_date"] = data["date"]
            if not data.get("sales_date"):
                data["sales_date"] = datetime.now().strftime("%Y-%m-%d")
        return data

class DailySaleResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    sku: str
    sales_date: str
    units_sold: int
    revenue: float
    channel: str = "PAYPAL_CHECKOUT"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
