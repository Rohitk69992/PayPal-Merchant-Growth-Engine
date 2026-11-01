import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.user import User, MerchantProfile, MerchantMember, MerchantSetting
from backend.app.models.audit import AuditLog

client = TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def create_authenticated_user(email_prefix: str) -> dict:
    unique_email = f"{email_prefix}_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "SecureUser2026!"
    reg = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": pwd,
        "full_name": f"User {email_prefix}"
    })
    assert reg.status_code == 201, reg.text
    data = reg.json()
    return {
        "email": unique_email,
        "password": pwd,
        "token": data["access_token"],
        "user_id": data["user"]["id"]
    }

def test_merchant_onboarding_and_settings_initialization(db: Session):
    user_a = create_authenticated_user("owner_a")
    headers = {"Authorization": f"Bearer {user_a['token']}"}

    # 1. Onboard new merchant
    merchant_data = {
        "business_name": "Apex Electronics Ltd",
        "category": "Consumer Electronics",
        "country": "USA",
        "currency": "USD",
        "description": "Premium electronics store",
        "address": "100 Market St, San Francisco, CA",
        "phone": "+1 (555) 019-2834"
    }

    res = client.post("/api/v1/merchants/onboarding", headers=headers, json=merchant_data)
    assert res.status_code == 201, res.text
    m_info = res.json()
    assert m_info["business_name"] == "Apex Electronics Ltd"
    assert m_info["currency"] == "USD"
    assert m_info["role"] == "OWNER"
    merchant_id = m_info["id"]

    # Verify DB persistence directly
    m_db = db.query(MerchantProfile).filter(MerchantProfile.id == merchant_id).first()
    assert m_db is not None
    assert m_db.business_name == "Apex Electronics Ltd"
    assert "100 Market St" in m_db.description

    # Verify membership created as OWNER
    member = db.query(MerchantMember).filter(
        MerchantMember.merchant_id == merchant_id,
        MerchantMember.user_id == user_a["user_id"]
    ).first()
    assert member is not None
    assert member.role == "OWNER"

    # Verify default settings created
    setting = db.query(MerchantSetting).filter(MerchantSetting.merchant_id == merchant_id).first()
    assert setting is not None
    assert setting.auto_reorder_enabled is False
    assert setting.default_safety_stock == 10
    assert setting.default_lead_time_days == 7

    # Verify audit log
    audit = db.query(AuditLog).filter(
        AuditLog.merchant_id == merchant_id,
        AuditLog.action == "MERCHANT_CREATED"
    ).first()
    assert audit is not None

def test_multiple_merchants_per_user_and_switching(db: Session):
    user = create_authenticated_user("multi_merchant")
    headers = {"Authorization": f"Bearer {user['token']}"}

    # Onboard Merchant 1 (USD)
    res1 = client.post("/api/v1/merchants/onboarding", headers=headers, json={
        "business_name": "North America Store",
        "currency": "USD"
    })
    assert res1.status_code == 201
    m1_id = res1.json()["id"]

    # Onboard Merchant 2 (EUR)
    res2 = client.post("/api/v1/merchants/onboarding", headers=headers, json={
        "business_name": "European Boutique",
        "currency": "EUR"
    })
    assert res2.status_code == 201
    m2_id = res2.json()["id"]

    # Get my merchants list
    my_merchants_res = client.get("/api/v1/merchants/my-merchants", headers=headers)
    assert my_merchants_res.status_code == 200
    merchants_list = my_merchants_res.json()
    assert len(merchants_list) >= 2
    ids = [m["id"] for m in merchants_list]
    assert m1_id in ids
    assert m2_id in ids

    # Access Merchant 1 via X-Merchant-ID header
    m1_headers = {**headers, "X-Merchant-ID": m1_id}
    cur_m1 = client.get("/api/v1/merchants/me", headers=m1_headers)
    assert cur_m1.status_code == 200
    assert cur_m1.json()["id"] == m1_id
    assert cur_m1.json()["currency"] == "USD"

    # Access Merchant 2 via X-Merchant-ID header
    m2_headers = {**headers, "X-Merchant-ID": m2_id}
    cur_m2 = client.get("/api/v1/merchants/me", headers=m2_headers)
    assert cur_m2.status_code == 200
    assert cur_m2.json()["id"] == m2_id
    assert cur_m2.json()["currency"] == "EUR"

def test_tenant_isolation_prevents_cross_tenant_access(db: Session):
    user_a = create_authenticated_user("tenant_a")
    user_b = create_authenticated_user("tenant_b")

    # User A creates Merchant A
    res_a = client.post("/api/v1/merchants/onboarding", headers={"Authorization": f"Bearer {user_a['token']}"}, json={
        "business_name": "Tenant A Secure Store",
        "currency": "USD"
    })
    merchant_a_id = res_a.json()["id"]

    # User B creates Merchant B
    res_b = client.post("/api/v1/merchants/onboarding", headers={"Authorization": f"Bearer {user_b['token']}"}, json={
        "business_name": "Tenant B Isolated Store",
        "currency": "GBP"
    })
    merchant_b_id = res_b.json()["id"]

    # User B tries to read Merchant A's data using X-Merchant-ID header
    breach_headers = {
        "Authorization": f"Bearer {user_b['token']}",
        "X-Merchant-ID": merchant_a_id
    }
    breach_attempt = client.get("/api/v1/merchants/me", headers=breach_headers)
    assert breach_attempt.status_code == 403
    assert "permission" in breach_attempt.json()["detail"].lower()

    # User A tries to read Merchant B's data
    breach_headers_2 = {
        "Authorization": f"Bearer {user_a['token']}",
        "X-Merchant-ID": merchant_b_id
    }
    breach_attempt_2 = client.get("/api/v1/merchants/me", headers=breach_headers_2)
    assert breach_attempt_2.status_code == 403
    assert "permission" in breach_attempt_2.json()["detail"].lower()

def test_merchant_membership_collaboration_and_rbac(db: Session):
    owner = create_authenticated_user("team_owner")
    analyst = create_authenticated_user("team_analyst")

    owner_headers = {"Authorization": f"Bearer {owner['token']}"}
    analyst_headers = {"Authorization": f"Bearer {analyst['token']}"}

    # Owner creates merchant
    res = client.post("/api/v1/merchants/onboarding", headers=owner_headers, json={
        "business_name": "Collaborative Retail Inc",
        "currency": "USD"
    })
    merchant_id = res.json()["id"]
    owner_m_headers = {**owner_headers, "X-Merchant-ID": merchant_id}
    analyst_m_headers = {**analyst_headers, "X-Merchant-ID": merchant_id}

    # 1. Analyst cannot access merchant before being invited
    pre_invite = client.get("/api/v1/merchants/me", headers=analyst_m_headers)
    assert pre_invite.status_code == 403

    # 2. Owner invites Analyst with ANALYST role
    invite_res = client.post("/api/v1/merchants/me/members", headers=owner_m_headers, json={
        "email": analyst["email"],
        "role": "ANALYST"
    })
    assert invite_res.status_code == 201
    member_record_id = invite_res.json()["id"]

    # 3. Analyst can now access merchant with ANALYST role
    post_invite = client.get("/api/v1/merchants/me", headers=analyst_m_headers)
    assert post_invite.status_code == 200
    assert post_invite.json()["role"] == "ANALYST"

    # 4. Analyst tries to update merchant profile (requires ADMIN/OWNER) -> 403 Forbidden
    unauth_update = client.put("/api/v1/merchants/me", headers=analyst_m_headers, json={
        "business_name": "Hacked Business Name"
    })
    assert unauth_update.status_code == 403
    assert "insufficient permissions" in unauth_update.json()["detail"].lower()

    # 5. Owner promotes Analyst to ADMIN
    promote_res = client.put(f"/api/v1/merchants/me/members/{member_record_id}", headers=owner_m_headers, json={
        "role": "ADMIN"
    })
    assert promote_res.status_code == 200
    assert promote_res.json()["role"] == "ADMIN"

    # 6. User (now ADMIN) can now update merchant profile
    auth_update = client.put("/api/v1/merchants/me", headers=analyst_m_headers, json={
        "business_name": "Collaborative Retail International"
    })
    assert auth_update.status_code == 200
    assert auth_update.json()["business_name"] == "Collaborative Retail International"

    # 7. Owner cannot demote the only OWNER
    owner_member = db.query(MerchantMember).filter(
        MerchantMember.merchant_id == merchant_id,
        MerchantMember.user_id == owner["user_id"]
    ).first()
    demote_sole_owner = client.put(f"/api/v1/merchants/me/members/{owner_member.id}", headers=owner_m_headers, json={
        "role": "VIEWER"
    })
    assert demote_sole_owner.status_code == 400
    assert "only owner" in demote_sole_owner.json()["detail"].lower()

    # 8. Owner removes Analyst from merchant
    remove_res = client.delete(f"/api/v1/merchants/me/members/{member_record_id}", headers=owner_m_headers)
    assert remove_res.status_code == 200

    # 9. Removed user can no longer access merchant
    post_remove = client.get("/api/v1/merchants/me", headers=analyst_m_headers)
    assert post_remove.status_code == 403

def test_merchant_settings_and_export(db: Session):
    owner = create_authenticated_user("settings_owner")
    headers = {"Authorization": f"Bearer {owner['token']}"}

    res = client.post("/api/v1/merchants/onboarding", headers=headers, json={
        "business_name": "Hardware Supply Hub",
        "currency": "USD"
    })
    merchant_id = res.json()["id"]
    m_headers = {**headers, "X-Merchant-ID": merchant_id}

    # 1. Get settings
    settings_res = client.get("/api/v1/merchants/me/settings", headers=m_headers)
    assert settings_res.status_code == 200
    assert settings_res.json()["default_safety_stock"] == 10

    # 2. Update settings
    update_res = client.put("/api/v1/merchants/me/settings", headers=m_headers, json={
        "auto_reorder_enabled": True,
        "default_safety_stock": 25,
        "default_lead_time_days": 14
    })
    assert update_res.status_code == 200
    assert update_res.json()["auto_reorder_enabled"] is True
    assert update_res.json()["default_safety_stock"] == 25
    assert update_res.json()["default_lead_time_days"] == 14

    # 3. GDPR Data Export
    export_res = client.get("/api/v1/settings/export", headers=m_headers)
    assert export_res.status_code == 200
    exp_data = export_res.json()
    assert exp_data["merchant"]["id"] == merchant_id
    assert exp_data["merchant"]["business_name"] == "Hardware Supply Hub"
    assert "products" in exp_data
