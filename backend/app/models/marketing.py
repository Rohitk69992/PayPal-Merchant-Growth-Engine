import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class MarketingCampaign(Base):
    __tablename__ = "marketing_campaigns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchant_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    target_segment = Column(String(100), nullable=False)
    headline = Column(String(255), nullable=False)
    email_subject = Column(String(255), nullable=False)
    body_copy = Column(Text, nullable=False)
    discount_code = Column(String(64), nullable=False)
    discount_pct = Column(Float, default=0.0, nullable=False)
    estimated_reach = Column(Integer, default=0, nullable=False)
    expected_conversion_rate = Column(Float, default=0.0, nullable=False)
    status = Column(String(30), default="DRAFT", nullable=False)  # DRAFT, SCHEDULED, ACTIVE, COMPLETED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
