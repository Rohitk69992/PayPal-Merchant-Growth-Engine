from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

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

class ManualTransactionCreate(BaseModel):
    type: str = Field(default="RECEIVED", description="RECEIVED (Sale) or PAYMENT (Expense) or REFUND")
    gross_amount: float = Field(gt=0.0)
    fee_amount: float = Field(default=0.0, ge=0.0)
    currency: Optional[str] = None  # Defaults to merchant currency
    title: str = Field(min_length=2, max_length=255)
    category: str = Field(default="Sales Revenue", max_length=100)
    notes: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_first_name: Optional[str] = None
    customer_last_name: Optional[str] = None
    transaction_date: Optional[datetime] = None

class PayPalTransactionImport(BaseModel):
    paypal_transaction_id: str = Field(min_length=3, max_length=64)
    type: str = Field(default="RECEIVED", description="RECEIVED, PAYMENT, REFUND")
    gross_amount: float
    fee_amount: float = 0.0
    net_amount: Optional[float] = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    status: str = Field(default="COMPLETED")
    title: str = Field(min_length=2, max_length=255)
    category: str = Field(default="PayPal Sale")
    notes: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = None
    transaction_date: Optional[datetime] = None

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

    model_config = ConfigDict(from_attributes=True)

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

    model_config = ConfigDict(from_attributes=True)
