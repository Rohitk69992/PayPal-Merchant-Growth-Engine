import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(64), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="General", nullable=False)
    unit_cost = Column(Float, default=0.0, nullable=False)
    selling_price = Column(Float, nullable=False)
    current_stock = Column(Integer, default=0, nullable=False)
    safety_stock = Column(Integer, default=10, nullable=False)
    lead_time_days = Column(Integer, default=7, nullable=False)
    supplier_name = Column(String(255), default="Direct Supplier", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("merchant_id", "sku", name="uq_merchant_product_sku"),
    )

    merchant = relationship("MerchantProfile", back_populates="products")
    movements = relationship("InventoryMovement", back_populates="product", cascade="all, delete-orphan")
    daily_sales = relationship("DailySale", back_populates="product", cascade="all, delete-orphan")
    reorder_recommendations = relationship("ReorderRecommendation", back_populates="product", cascade="all, delete-orphan")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    movement_type = Column(String(50), nullable=False)  # INITIAL, SALE, RESTOCK, ADJUSTMENT, RETURN
    quantity = Column(Integer, nullable=False)  # positive or negative
    stock_after = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=True)
    reference_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    product = relationship("Product", back_populates="movements")

class DailySale(Base):
    __tablename__ = "daily_sales"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sales_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD format
    units_sold = Column(Integer, default=0, nullable=False)
    revenue = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("merchant_id", "product_id", "sales_date", name="uq_merchant_product_daily_sale"),
    )

    product = relationship("Product", back_populates="daily_sales")

class ReorderRecommendation(Base):
    __tablename__ = "reorder_recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    recommended_quantity = Column(Integer, nullable=False)
    reasoning = Column(Text, nullable=False)
    urgency = Column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(30), default="PENDING", nullable=False)  # PENDING, ORDERED, DISMISSED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    product = relationship("Product", back_populates="reorder_recommendations")

class PurchaseOrderDraft(Base):
    __tablename__ = "purchase_order_drafts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    supplier_name = Column(String(255), nullable=False)
    status = Column(String(30), default="DRAFT", nullable=False)  # DRAFT, SUBMITTED, RECEIVED, CANCELLED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    received_at = Column(DateTime, nullable=True)

    product = relationship("Product")
