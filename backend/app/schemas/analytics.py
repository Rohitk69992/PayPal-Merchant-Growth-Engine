from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class OverviewResponse(BaseModel):
    total_balance: float
    gross_sales_30d: float
    growth_rate_pct: float
    transaction_count: int
    active_products: int
    customer_count: int
    low_stock_count: int
    paypal_connected: bool
    account_status: str
    currency: str

class RFMSegmentResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    customer_count: int
    percentage: float
    avg_spend: float
    avg_recency_days: int
    color: str

    model_config = ConfigDict(from_attributes=True)

class LocationShare(BaseModel):
    city: str
    percentage: float

class CategoryShare(BaseModel):
    category: str
    percentage: float

class DemandForecastPoint(BaseModel):
    month_or_date: str
    actual_units: Optional[float] = None
    projected_units: float
    lower_bound: float
    upper_bound: float

class DemandForecastResponse(BaseModel):
    product_id: str
    product_name: str
    sku: str
    model_type: str
    confidence_score: float
    historical_daily_average: float
    projected_growth_pct: float
    points: List[DemandForecastPoint]
    data_sufficiency_status: str  # SUFFICIENT | INSUFFICIENT_DATA
    message: str
    reorder_recommendation_units: Optional[int] = None
    status: Optional[str] = None
    method: Optional[str] = None
    growth_rate_pct: Optional[float] = None
    recommended_units_next_period: Optional[int] = None
    data_points_used: Optional[int] = None
    rationale: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
