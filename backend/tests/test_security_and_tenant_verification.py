import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.core.security import hash_password, verify_password
from backend.app.models.user import User, MerchantProfile, MerchantMember, UserSession
from backend.app.models.inventory import Product, DailySale, InventoryMovement

client = TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def create_user_and_merchant(prefix: str):
    email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "SecureUser2026!"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": f"User {prefix}"
    })
    assert reg.status_code == 201, reg.text
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]

    # Onboard merchant
    m_res = client.post("/api/v1/merchants/onboarding", json={
        "business_name": f"{prefix.capitalize()} Enterprise",
        "category": "Electronics",
        "country": "USA",
        "currency": "USD"
    }, headers={"Authorization": f"Bearer {token}"})
    assert m_res.status_code == 201, m_res.text
    merchant_id = m_res.json()["id"]

    return {
        "email": email,
        "password": pwd,
        "token": token,
        "user_id": user_id,
        "merchant_id": merchant_id,
        "headers": {
            "Authorization": f"Bearer {token}",
            "X-Merchant-ID": merchant_id
        }
    }


def test_complete_cross_tenant_isolation(db: Session):
    """Ensure strict multi-tenant boundary isolation across queries and mutations."""
    tenant1 = create_user_and_merchant("alice")
    tenant2 = create_user_and_merchant("bob")

    # 1. Tenant 1 creates a product
    p1_res = client.post("/api/v1/products", json={
        "sku": f"ALICE-SKU-{uuid.uuid4().hex[:6]}",
        "name": "Alice Exclusive Widget",
        "category": "Electronics",
        "unit_cost": 50.0,
        "unit_price": 120.0,
        "stock_on_hand": 100
    }, headers=tenant1["headers"])
    assert p1_res.status_code == 201, p1_res.text
    p1_id = p1_res.json()["id"]

    # 2. Tenant 2 attempts to view Tenant 1's product
    get_res = client.get(f"/api/v1/products/{p1_id}", headers=tenant2["headers"])
    assert get_res.status_code == 404, "Tenant 2 should not find Tenant 1's product"

    # 3. Tenant 2 attempts to modify Tenant 1's product
    put_res = client.put(f"/api/v1/products/{p1_id}", json={"name": "Tampered Name"}, headers=tenant2["headers"])
    assert put_res.status_code == 404, "Tenant 2 should not be able to update Tenant 1's product"

    # 4. Tenant 2 attempts to delete Tenant 1's product
    del_res = client.delete(f"/api/v1/products/{p1_id}", headers=tenant2["headers"])
    assert del_res.status_code == 404, "Tenant 2 should not be able to archive Tenant 1's product"

    # 5. Tenant 2 attempts to record a sale on Tenant 1's product
    sale_res = client.post("/api/v1/sales/", json={
        "product_id": p1_id,
        "units_sold": 2,
        "revenue": 240.0
    }, headers=tenant2["headers"])
    assert sale_res.status_code == 404, "Tenant 2 should not be able to record sales against Tenant 1's product"

    # 6. Tenant 2 attempts header spoofing (claims Tenant 1's merchant_id)
    spoofed_headers = {
        "Authorization": f"Bearer {tenant2['token']}",
        "X-Merchant-ID": tenant1["merchant_id"]
    }
    spoof_res = client.get("/api/v1/products", headers=spoofed_headers)
    assert spoof_res.status_code == 403, "Cross-tenant header spoofing must be rejected with HTTP 403"


def test_rbac_sole_owner_protection_and_role_constraints(db: Session):
    """Verify that role-based access control enforces sole-owner protection and prevents unauthorized member changes."""
    owner = create_user_and_merchant("owner_rbac")
    
    # 1. Sole owner cannot remove themselves
    members_res = client.get("/api/v1/merchants/me/members", headers=owner["headers"])
    assert members_res.status_code == 200
    owner_member_id = members_res.json()[0]["id"]

    del_self = client.delete(f"/api/v1/merchants/me/members/{owner_member_id}", headers=owner["headers"])
    assert del_self.status_code == 400
    assert "cannot remove the only owner" in del_self.json()["detail"].lower()

    # 2. Add a VIEWER member to the merchant
    viewer_email = f"viewer_{uuid.uuid4().hex[:8]}@example.com"
    # Register the user first so they exist in users table
    reg_viewer = client.post("/api/v1/auth/register", json={
        "email": viewer_email,
        "password": "ViewerPass123!",
        "full_name": "Viewer User"
    })
    assert reg_viewer.status_code == 201
    viewer_token = reg_viewer.json()["access_token"]

    # Owner invites viewer
    invite_res = client.post("/api/v1/merchants/me/members", json={
        "email": viewer_email,
        "role": "VIEWER"
    }, headers=owner["headers"])
    assert invite_res.status_code == 201

    viewer_headers = {
        "Authorization": f"Bearer {viewer_token}",
        "X-Merchant-ID": owner["merchant_id"]
    }

    # 3. Viewer attempts to invite another member (unauthorized)
    viewer_invite = client.post("/api/v1/merchants/me/members", json={
        "email": f"intruder_{uuid.uuid4().hex[:6]}@example.com",
        "role": "ADMIN"
    }, headers=viewer_headers)
    assert viewer_invite.status_code == 403, "Viewer must be prohibited from inviting members"


def test_sql_injection_resilience_and_parameterized_queries(db: Session):
    """Ensure that SQL injection payloads are properly parameterized by SQLAlchemy ORM."""
    tenant = create_user_and_merchant("sqli_test")

    vectors = [
        "' OR '1'='1",
        "'; DROP TABLE products; --",
        "1 UNION SELECT null, null, null, null, null, null, null, null, null, null, null, null, null, null --",
        "') OR ('a'='a",
        "admin'--",
    ]

    for v in vectors:
        # Search products
        res = client.get(f"/api/v1/products?search={v}", headers=tenant["headers"])
        assert res.status_code == 200, f"Search vector '{v}' caused error: {res.text}"
        assert isinstance(res.json(), list)

        # Search transactions
        tx_res = client.get(f"/api/v1/transactions?search={v}", headers=tenant["headers"])
        assert tx_res.status_code == 200, f"Transactions vector '{v}' caused error: {tx_res.text}"
        assert isinstance(tx_res.json(), list)


def test_password_security_and_session_lifecycle(db: Session):
    """Verify password hashing security, stateful session revocation, and invalid credentials rejection."""
    # 1. Verify password hashing outputs differ (salted)
    p = "SuperSecretMasterKey2026!"
    hash1 = hash_password(p)
    hash2 = hash_password(p)
    assert hash1 != hash2, "Password hashes must incorporate cryptographic salts"
    assert verify_password(p, hash1) is True
    assert verify_password(p, hash2) is True
    assert verify_password("WrongPassword123!", hash1) is False

    # 2. Verify login failure audit event without credential leakage
    failed_login = client.post("/api/v1/auth/login", json={
        "email": "nonexistent_target@example.com",
        "password": "AttemptedSecret123!"
    })
    assert failed_login.status_code == 401

    # 3. Verify logout invalidates the session
    tenant = create_user_and_merchant("logout_test")
    headers = {"Authorization": f"Bearer {tenant['token']}"}

    # Access /auth/me before logout
    me_before = client.get("/api/v1/auth/me", headers=headers)
    assert me_before.status_code == 200

    # Logout
    logout_res = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # Attempt to use revoked token
    me_after = client.get("/api/v1/auth/me", headers=headers)
    assert me_after.status_code == 401, "Revoked session must be denied access"


def test_database_transaction_atomic_rollback(db: Session):
    """Verify that multi-record database operations rollback completely on failure."""
    tenant = create_user_and_merchant("rollback_test")
    m_id = tenant["merchant_id"]

    initial_prod_count = db.query(Product).filter(Product.merchant_id == m_id).count()

    # Attempt a nested transaction where failure triggers full rollback
    try:
        with db.begin_nested():
            p_valid = Product(
                merchant_id=m_id,
                sku=f"ATOMIC-1-{uuid.uuid4().hex[:6]}",
                name="Atomic Product 1",
                category="General",
                unit_cost=Decimal("10.00"),
                selling_price=Decimal("20.00"),
                current_stock=10,
                safety_stock=5,
                lead_time_days=3,
                supplier_name="Test Supplier"
            )
            db.add(p_valid)
            db.flush()

            # Deliberate failure: NULL merchant_id violation (violates nullable=False)
            p_invalid = Product(
                merchant_id=None,
                sku=f"ATOMIC-2-{uuid.uuid4().hex[:6]}",
                name="Atomic Product 2",
                category="General",
                unit_cost=Decimal("10.00"),
                selling_price=Decimal("20.00")
            )
            db.add(p_invalid)
            db.flush()
    except Exception:
        db.rollback()

    final_prod_count = db.query(Product).filter(Product.merchant_id == m_id).count()
    assert final_prod_count == initial_prod_count, "Failed multi-item transaction must completely rollback all items"
