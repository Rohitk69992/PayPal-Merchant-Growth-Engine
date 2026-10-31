from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class OrderItemSchema(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)

class CheckoutOrderCreate(BaseModel):
    items: List[OrderItemSchema]
    customer_email: EmailStr
    customer_first_name: Optional[str] = "Guest"
    customer_last_name: Optional[str] = "Customer"
    customer_city: Optional[str] = "San Jose"
    customer_country: Optional[str] = "USA"

class CheckoutOrderCapture(BaseModel):
    paypal_order_id: str

class TransactionResponse(BaseModel):
    id: str
    order_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    paypal_transaction_id: Optional[str] = None
    type: str
    gross_amount: float
    fee_amount: float
    net_amount: float
    currency: str
    status: str
    payment_source: str
    transaction_date: datetime
    title: str
    category: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class CustomerResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    city: str
    country: str
    total_spend: float
    order_count: int
    first_purchase_at: Optional[datetime] = None
    last_purchase_at: Optional[datetime] = None

    class Config:
        from_attributes = True
