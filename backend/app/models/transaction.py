import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    paypal_payer_id = Column(String(64), nullable=True)
    email = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    city = Column(String(100), default="Unknown", nullable=False)
    country = Column(String(3), default="USA", nullable=False)
    total_spend = Column(Float, default=0.0, nullable=False)
    order_count = Column(Integer, default=0, nullable=False)
    first_purchase_at = Column(DateTime, nullable=True)
    last_purchase_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("merchant_id", "email", name="uq_merchant_customer_email"),
    )

    merchant = relationship("MerchantProfile", back_populates="customers")
    transactions = relationship("Transaction", back_populates="customer")
    orders = relationship("Order", back_populates="customer")

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    paypal_order_id = Column(String(64), nullable=True, index=True)
    gross_amount = Column(Float, nullable=False)
    fee_amount = Column(Float, default=0.0, nullable=False)
    net_amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    status = Column(String(50), default="CREATED", nullable=False)  # CREATED, APPROVED, COMPLETED, REFUNDED
    order_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    transaction = relationship("Transaction", back_populates="order", uselist=False)

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    sku = Column(String(64), nullable=False)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    paypal_transaction_id = Column(String(64), nullable=True, index=True)
    type = Column(String(30), default="PAYMENT", nullable=False)  # PAYMENT, RECEIVED, REFUND
    gross_amount = Column(Float, nullable=False)
    fee_amount = Column(Float, default=0.0, nullable=False)
    net_amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    status = Column(String(50), default="COMPLETED", nullable=False)  # COMPLETED, PENDING, REFUNDED, DISPUTED
    payment_source = Column(String(50), default="PAYPAL_CHECKOUT", nullable=False)
    transaction_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(100), default="Sales Revenue", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    merchant = relationship("MerchantProfile", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    order = relationship("Order", back_populates="transaction")
