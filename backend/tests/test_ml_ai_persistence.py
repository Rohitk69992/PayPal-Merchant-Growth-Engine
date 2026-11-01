import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.user import User, MerchantProfile
from backend.app.models.analytics import (
    CustomerSegment,
    CustomerSegmentAssignment,
    DemandForecast,
    MLModel,
    MLTrainingRun,
)
from backend.app.models.marketing import MarketingCampaign
from backend.app.models.agent import AgentConversation, AgentMessage, AgentToolExecution
from backend.app.models.transaction import Customer, Transaction
from backend.app.models.inventory import Product, DailySale

client = TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def setup_merchant(email_prefix: str) -> dict:
    unique_email = f"{email_prefix}_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "SecurePassword2026!"
    reg = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": pwd,
        "full_name": f"Owner {email_prefix}"
    })
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]

    res = client.post("/api/v1/merchants/onboarding", headers={"Authorization": f"Bearer {token}"}, json={
        "business_name": f"Store {email_prefix}",
        "currency": "USD"
    })
    merchant_id = res.json()["id"]

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Merchant-ID": merchant_id
    }
    return {
        "user_id": user_id,
        "merchant_id": merchant_id,
        "token": token,
        "headers": headers
    }

def test_rfm_customer_segmentation_persistence_and_training_run(db: Session):
    m_ctx = setup_merchant("rfm_test")
    headers = m_ctx["headers"]
    m_id = m_ctx["merchant_id"]

    # 1. Zero customers -> INSUFFICIENT_DATA
    res_empty = client.get("/api/v1/analytics/rfm-segments", headers=headers)
    assert res_empty.status_code == 200
    assert res_empty.json()["status"] == "INSUFFICIENT_DATA"

    # 2. Add 5 distinct customers with transactions
    now = datetime.now(timezone.utc)
    for i in range(5):
        cust = Customer(
            merchant_id=m_id,
            email=f"cust_{i}_{uuid.uuid4().hex[:6]}@example.com",
            first_name=f"Customer{i}",
            total_spend=Decimal(str((i + 1) * 75.0)),
            order_count=i + 1,
            last_purchase_at=now - timedelta(days=i * 10)
        )
        db.add(cust)
    db.commit()

    # 3. Execute RFM clustering
    res_rfm = client.get("/api/v1/analytics/rfm-segments", headers=headers)
    assert res_rfm.status_code == 200
    rfm_data = res_rfm.json()
    assert rfm_data["status"] == "SUFFICIENT"
    assert len(rfm_data["segments"]) >= 2

    # 4. Verify DB persistence of CustomerSegment and CustomerSegmentAssignment
    segments = db.query(CustomerSegment).filter(CustomerSegment.merchant_id == m_id).all()
    assert len(segments) >= 2

    assignments = db.query(CustomerSegmentAssignment).filter(CustomerSegmentAssignment.merchant_id == m_id).all()
    assert len(assignments) == 5

    # 5. Verify MLModel and MLTrainingRun persistence
    ml_model = db.query(MLModel).filter(
        MLModel.merchant_id == m_id,
        MLModel.model_name == "KMEANS_RFM"
    ).first()
    assert ml_model is not None
    assert "KMeans" in ml_model.algorithm

    run = db.query(MLTrainingRun).filter(
        MLTrainingRun.merchant_id == m_id,
        MLTrainingRun.model_id == ml_model.id
    ).first()
    assert run is not None
    assert run.status == "COMPLETED"
    assert run.data_points_count == 5
    assert "silhouette_score" in run.metrics_json

def test_demand_forecasting_persistence_and_training_run(db: Session):
    m_ctx = setup_merchant("fc_test")
    headers = m_ctx["headers"]
    m_id = m_ctx["merchant_id"]

    # Create product
    prod_res = client.post("/api/v1/products", headers=headers, json={
        "sku": f"FC-{uuid.uuid4().hex[:6].upper()}",
        "name": "Mechanical Keyboard Pro",
        "current_stock": 40,
        "selling_price": 80.00
    })
    prod_id = prod_res.json()["id"]

    # 1. Zero sales -> INSUFFICIENT_DATA
    fc_empty = client.get(f"/api/v1/analytics/forecasts/{prod_id}", headers=headers)
    assert fc_empty.status_code == 200
    assert fc_empty.json()["data_sufficiency_status"] == "INSUFFICIENT_DATA"

    # 2. Add 7 consecutive daily sales records
    base_date = datetime.now(timezone.utc) - timedelta(days=10)
    for day in range(7):
        date_str = (base_date + timedelta(days=day)).strftime("%Y-%m-%d")
        client.post("/api/v1/sales/daily", headers=headers, json={
            "product_id": prod_id,
            "sales_date": date_str,
            "units_sold": 5 + (day % 3)
        })

    # 3. Generate forecast
    fc_res = client.get(f"/api/v1/analytics/forecasts/{prod_id}", headers=headers)
    assert fc_res.status_code == 200
    fc_data = fc_res.json()
    assert fc_data["data_sufficiency_status"] == "SUFFICIENT"
    assert len(fc_data["points"]) > 5

    # 4. Verify DemandForecast rows persisted in PostgreSQL
    db_forecasts = db.query(DemandForecast).filter(
        DemandForecast.merchant_id == m_id,
        DemandForecast.product_id == prod_id
    ).all()
    assert len(db_forecasts) >= 7
    for f in db_forecasts:
        assert float(f.predicted_units) >= 0.0
        assert float(f.lower_bound) <= float(f.upper_bound)
        assert f.confidence_score == 0.95

    # 5. Verify MLModel and MLTrainingRun persisted
    ml_model = db.query(MLModel).filter(
        MLModel.merchant_id == m_id,
        MLModel.model_name == "DEMAND_FORECASTING"
    ).first()
    assert ml_model is not None

    run = db.query(MLTrainingRun).filter(
        MLTrainingRun.merchant_id == m_id,
        MLTrainingRun.model_id == ml_model.id
    ).first()
    assert run is not None
    assert run.status == "COMPLETED"
    assert run.data_points_count == 7
    assert "historical_daily_average" in run.metrics_json

def test_marketing_campaigns_lifecycle_and_persistence(db: Session):
    m_ctx = setup_merchant("mkt_test")
    headers = m_ctx["headers"]
    m_id = m_ctx["merchant_id"]

    # 1. Create campaign draft
    payload = {
        "target_segment": "Promising / Returning",
        "headline": "Special 20% Appreciation Reward",
        "email_subject": "A special token of appreciation for your loyalty",
        "body_copy": "Thank you for shopping with us! Here is an exclusive 20% coupon code.",
        "discount_code": "THANKYOU20",
        "discount_pct": 20.0
    }
    create_res = client.post("/api/v1/marketing/campaigns", headers=headers, json=payload)
    assert create_res.status_code == 201
    camp_id = create_res.json()["id"]
    assert create_res.json()["status"] == "DRAFT"

    # Verify DB persistence
    camp_db = db.query(MarketingCampaign).filter(MarketingCampaign.id == camp_id).first()
    assert camp_db is not None
    assert camp_db.headline == "Special 20% Appreciation Reward"
    assert camp_db.discount_code == "THANKYOU20"

    # 2. Activate campaign
    act_res = client.put(f"/api/v1/marketing/campaigns/{camp_id}/activate", headers=headers)
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "ACTIVE"

    # 3. List campaigns
    list_res = client.get("/api/v1/marketing/campaigns", headers=headers)
    assert list_res.status_code == 200
    assert any(c["id"] == camp_id for c in list_res.json())

def test_agent_conversations_and_tool_executions_persistence(db: Session):
    m_ctx = setup_merchant("agent_test")
    headers = m_ctx["headers"]
    m_id = m_ctx["merchant_id"]

    # 1. Start a new conversation via AI chat
    chat_res = client.post("/api/v1/agent/chat", headers=headers, json={
        "query_text": "What is my inventory status right now?"
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    conv_id = chat_data["conversation_id"]
    assert conv_id is not None
    assert len(chat_data["executed_tools"]) >= 1

    # 2. Multi-turn continuation on same conversation
    chat_res_2 = client.post("/api/v1/agent/chat", headers=headers, json={
        "conversation_id": conv_id,
        "query_text": "Give me an overview of my business metrics."
    })
    assert chat_res_2.status_code == 200
    assert chat_res_2.json()["conversation_id"] == conv_id

    # 3. Verify conversation and messages in DB
    conv_db = db.query(AgentConversation).filter(AgentConversation.id == conv_id).first()
    assert conv_db is not None
    assert conv_db.merchant_id == m_id

    messages = db.query(AgentMessage).filter(AgentMessage.conversation_id == conv_id).all()
    assert len(messages) >= 4  # 2 user messages + 2 agent responses

    # 4. Verify tool executions audit records
    tool_execs = db.query(AgentToolExecution).filter(
        AgentToolExecution.merchant_id == m_id,
        AgentToolExecution.conversation_id == conv_id
    ).all()
    assert len(tool_execs) >= 2
    for te in tool_execs:
        assert te.status == "SUCCESS"
        assert te.tool_name in ["get_inventory_status", "get_merchant_overview"]

    # 5. Verify API endpoints for conversation history and tool executions
    conv_history = client.get(f"/api/v1/agent/conversations/{conv_id}", headers=headers)
    assert conv_history.status_code == 200
    assert len(conv_history.json()["messages"]) >= 4

    tool_api = client.get(f"/api/v1/agent/tool-executions?conversation_id={conv_id}", headers=headers)
    assert tool_api.status_code == 200
    assert len(tool_api.json()) >= 2
