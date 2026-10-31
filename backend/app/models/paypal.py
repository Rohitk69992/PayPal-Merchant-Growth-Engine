import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class PayPalConnection(Base):
    __tablename__ = "paypal_connections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    environment = Column(String(20), default="sandbox", nullable=False)  # sandbox | live
    client_id = Column(String(255), nullable=False)
    encrypted_client_secret = Column(Text, nullable=False)
    webhook_id = Column(String(100), nullable=True)
    is_connected = Column(Boolean, default=False, nullable=False)
    last_sync_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    merchant = relationship("MerchantProfile", back_populates="paypal_connection")

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(100), unique=True, index=True, nullable=False)
    event_type = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    summary = Column(Text, nullable=True)
    raw_payload = Column(Text, nullable=False)
    status = Column(String(50), default="RECEIVED", nullable=False)  # RECEIVED, PROCESSED, FAILED, DUPLICATE
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class PayPalSyncJob(Base):
    __tablename__ = "paypal_sync_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, RUNNING, COMPLETED, FAILED
    records_synced = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)
