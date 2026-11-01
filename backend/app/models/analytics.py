import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, Integer, Float, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class CustomerSegment(Base):
    __tablename__ = "customer_segments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # VIP, Loyal, Returning, New, At-Risk
    description = Column(Text, nullable=True)
    customer_count = Column(Integer, default=0, nullable=False)
    percentage = Column(Numeric(5, 2), default=0.00, nullable=False)
    avg_spend = Column(Numeric(12, 2), default=0.00, nullable=False)
    avg_recency_days = Column(Integer, default=0, nullable=False)
    color = Column(String(20), default="#3B82F6", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("merchant_id", "name", name="uq_merchant_segment_name"),
    )

    assignments = relationship("CustomerSegmentAssignment", back_populates="segment", cascade="all, delete-orphan")

class CustomerSegmentAssignment(Base):
    __tablename__ = "customer_segment_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    segment_id = Column(String(36), ForeignKey("customer_segments.id", ondelete="CASCADE"), nullable=False, index=True)
    recency_days = Column(Integer, nullable=False)
    frequency_count = Column(Integer, nullable=False)
    monetary_total = Column(Numeric(12, 2), nullable=False)
    r_score = Column(Integer, default=1, nullable=False)
    f_score = Column(Integer, default=1, nullable=False)
    m_score = Column(Integer, default=1, nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("merchant_id", "customer_id", name="uq_merchant_customer_assignment"),
    )

    segment = relationship("CustomerSegment", back_populates="assignments")

class DemandForecast(Base):
    __tablename__ = "demand_forecasts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    forecast_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    predicted_units = Column(Numeric(10, 2), nullable=False)
    lower_bound = Column(Numeric(10, 2), nullable=False)
    upper_bound = Column(Numeric(10, 2), nullable=False)
    model_type = Column(String(50), default="HOLT_WINTERS", nullable=False)
    confidence_score = Column(Float, default=0.95, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("merchant_id", "product_id", "forecast_date", name="uq_merchant_product_forecast"),
    )

class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(100), nullable=False)  # e.g., HOLT_WINTERS_DEMAND, KMEANS_RFM
    version = Column(String(50), default="1.0.0", nullable=False)
    algorithm = Column(String(100), nullable=False)  # e.g., Statsmodels ExponentialSmoothing, Scikit-Learn KMeans
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    training_runs = relationship("MLTrainingRun", back_populates="model", cascade="all, delete-orphan")

class MLTrainingRun(Base):
    __tablename__ = "ml_training_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    model_id = Column(String(36), ForeignKey("ml_models.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), default="COMPLETED", nullable=False)  # STARTED, COMPLETED, FAILED
    dataset_start_date = Column(String(10), nullable=True)
    dataset_end_date = Column(String(10), nullable=True)
    data_points_count = Column(Integer, default=0, nullable=False)
    metrics_json = Column(Text, nullable=True)  # MAE, RMSE, silhouette_score
    parameters_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    model = relationship("MLModel", back_populates="training_runs")
