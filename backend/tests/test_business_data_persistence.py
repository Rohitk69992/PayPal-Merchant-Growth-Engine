import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.user import User, MerchantProfile, MerchantMember
from backend.app.models.inventory import Product, InventoryMovement, DailySale, PurchaseOrderDraft
from backend.app.models.transaction import Transaction, Customer

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

def test_product_catalog_lifecycle_and_sku_uniqueness(db: Session):
    m_ctx = setup_merchant("prod_test")
    headers = m_ctx["headers"]
    sku = f"SKU-{uuid.uuid4().hex[:6].upper()}"

    # 1. Create product
    payload = {
        "sku": sku,
        "name": "Noise Cancelling Headphones X1",
        "category": "Audio & Electronics",
        "unit_cost": 45.00,
        "selling_price": 99.99,
        "current_stock": 50,
        "safety_stock": 10,
        "lead_time_days": 5,
        "supplier_name": "SoundWave Inc"
    }
    res = client.post("/api/v1/products", headers=headers, json=payload)
    assert res.status_code == 201, res.text
    p_data = res.json()
    assert p_data["sku"] == sku
    assert p_data["current_stock"] == 50
    assert p_data["selling_price"] == 99.99
    product_id = p_data["id"]

    # Verify initial movement created
    mov = db.query(InventoryMovement).filter(
        InventoryMovement.product_id == product_id,
        InventoryMovement.movement_type == "INITIAL"
    ).first()
    assert mov is not None
    assert mov.quantity == 50
    assert mov.stock_after == 50

    # 2. Duplicate SKU in same merchant rejected
    dup_res = client.post("/api/v1/products", headers=headers, json=payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"].lower()

    # 3. Same SKU in different merchant succeeds (scoped uniqueness)
    other_m = setup_merchant("other_m_sku")
    other_res = client.post("/api/v1/products", headers=other_m["headers"], json=payload)
    assert other_res.status_code == 201

    # 4. Update product
    update_res = client.put(f"/api/v1/products/{product_id}", headers=headers, json={
        "name": "Noise Cancelling Headphones X1 Pro",
        "selling_price": 109.99
    })
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Noise Cancelling Headphones X1 Pro"
    assert update_res.json()["selling_price"] == 109.99

    # 5. Archive product
    del_res = client.delete(f"/api/v1/products/{product_id}", headers=headers)
    assert del_res.status_code == 200

    # Product no longer in active list
    list_res = client.get("/api/v1/products", headers=headers)
    assert not any(p["id"] == product_id for p in list_res.json())

def test_inventory_ledger_movements_and_stock_adjustments(db: Session):
    m_ctx = setup_merchant("inv_test")
    headers = m_ctx["headers"]

    # Create product with 20 stock
    prod_res = client.post("/api/v1/products", headers=headers, json={
        "sku": f"LEDGER-{uuid.uuid4().hex[:6].upper()}",
        "name": "Smart Watch Series 5",
        "current_stock": 20,
        "selling_price": 150.00
    })
    prod_id = prod_res.json()["id"]

    # 1. Adjust stock up (+15)
    adj_up = client.post("/api/v1/inventory/adjust-stock", headers=headers, json={
        "product_id": prod_id,
        "adjustment_units": 15,
        "reason": "Restocked warehouse shipment"
    })
    assert adj_up.status_code == 200
    assert adj_up.json()["current_stock"] == 35

    # 2. Adjust stock down (-5)
    adj_down = client.post("/api/v1/inventory/adjust-stock", headers=headers, json={
        "product_id": prod_id,
        "adjustment_units": -5,
        "reason": "Damaged goods written off"
    })
    assert adj_down.status_code == 200
    assert adj_down.json()["current_stock"] == 30

    # 3. Invalid negative stock rejected
    adj_invalid = client.post("/api/v1/inventory/adjust-stock", headers=headers, json={
        "product_id": prod_id,
        "adjustment_units": -50,
        "reason": "Impossible reduction"
    })
    assert adj_invalid.status_code == 400
    assert "negative stock" in adj_invalid.json()["detail"].lower()

    # 4. Verify full audit trail via /inventory/movements
    mov_res = client.get(f"/api/v1/inventory/movements?product_id={prod_id}", headers=headers)
    assert mov_res.status_code == 200
    movements = mov_res.json()
    assert len(movements) >= 3  # INITIAL, ADJUSTMENT (+15), ADJUSTMENT (-5)
    types = [m["movement_type"] for m in movements]
    assert "INITIAL" in types
    assert "ADJUSTMENT" in types

def test_daily_sales_history_and_stock_depletion(db: Session):
    m_ctx = setup_merchant("sales_test")
    headers = m_ctx["headers"]
    sku = f"SALE-{uuid.uuid4().hex[:6].upper()}"

    prod_res = client.post("/api/v1/products", headers=headers, json={
        "sku": sku,
        "name": "Wireless Charging Pad",
        "current_stock": 100,
        "selling_price": 25.00
    })
    prod_id = prod_res.json()["id"]

    # 1. Record sale for date 2026-10-15 (10 units)
    sale_1 = client.post("/api/v1/sales/daily", headers=headers, json={
        "product_id": prod_id,
        "sales_date": "2026-10-15",
        "units_sold": 10,
        "revenue": 250.00
    })
    assert sale_1.status_code == 201
    assert sale_1.json()["units_sold"] == 10
    assert sale_1.json()["revenue"] == 250.00

    # Verify stock depleted to 90
    check_p1 = client.get(f"/api/v1/products/{prod_id}", headers=headers)
    assert check_p1.json()["current_stock"] == 90

    # Verify SALE movement recorded
    mov = db.query(InventoryMovement).filter(
        InventoryMovement.product_id == prod_id,
        InventoryMovement.movement_type == "SALE"
    ).first()
    assert mov is not None
    assert mov.quantity == -10
    assert mov.stock_after == 90

    # 2. Add more sales on same date (5 more units) -> should increment cleanly
    sale_2 = client.post("/api/v1/sales/daily", headers=headers, json={
        "product_id": prod_id,
        "sales_date": "2026-10-15",
        "units_sold": 5
    })
    assert sale_2.status_code == 201
    assert sale_2.json()["units_sold"] == 15
    assert sale_2.json()["revenue"] == 375.00

    # Stock now 85
    check_p2 = client.get(f"/api/v1/products/{prod_id}", headers=headers)
    assert check_p2.json()["current_stock"] == 85

def test_transactions_manual_entry_and_paypal_import_idempotency(db: Session):
    m_ctx = setup_merchant("tx_test")
    headers = m_ctx["headers"]
    cust_email = f"buyer_{uuid.uuid4().hex[:6]}@example.com"

    # 1. Manual Transaction
    tx_payload = {
        "type": "RECEIVED",
        "gross_amount": 120.00,
        "fee_amount": 3.60,
        "title": "Direct B2B Invoice Payment",
        "category": "Invoiced Sales",
        "customer_email": cust_email,
        "customer_first_name": "Alice",
        "customer_last_name": "Smith"
    }
    tx_res = client.post("/api/v1/transactions", headers=headers, json=tx_payload)
    assert tx_res.status_code == 201, tx_res.text
    tx_data = tx_res.json()
    assert tx_data["payment_source"] == "MANUAL"
    assert tx_data["gross_amount"] == 120.00
    assert tx_data["fee_amount"] == 3.60
    assert tx_data["net_amount"] == 116.40
    assert tx_data["customer_name"] == "Alice Smith"

    # Verify customer created
    cust = db.query(Customer).filter(Customer.id == tx_data["customer_id"]).first()
    assert cust is not None
    assert cust.email == cust_email
    assert float(cust.total_spend) == 120.00
    assert cust.order_count == 1

    # 2. PayPal Transaction Import with Idempotency
    paypal_tx_id = f"PAYPAL-TX-{uuid.uuid4().hex[:10].upper()}"
    pp_payload = {
        "paypal_transaction_id": paypal_tx_id,
        "type": "RECEIVED",
        "gross_amount": 250.00,
        "fee_amount": 7.25,
        "currency": "USD",
        "status": "COMPLETED",
        "title": "PayPal Checkout Order #991",
        "category": "Online Sale",
        "customer_email": cust_email
    }

    # First import creates transaction
    pp_res1 = client.post("/api/v1/transactions/import-paypal", headers=headers, json=pp_payload)
    assert pp_res1.status_code == 200
    pp_data1 = pp_res1.json()
    assert pp_data1["payment_source"] == "PAYPAL_IMPORT"
    assert pp_data1["paypal_transaction_id"] == paypal_tx_id
    assert pp_data1["net_amount"] == 242.75

    # Second import with SAME paypal_transaction_id is idempotent (returns existing without duplicate)
    pp_res2 = client.post("/api/v1/transactions/import-paypal", headers=headers, json=pp_payload)
    assert pp_res2.status_code == 200
    assert pp_res2.json()["id"] == pp_data1["id"]

    # Verify only ONE transaction exists in DB for this PayPal ID
    tx_count = db.query(Transaction).filter(
        Transaction.merchant_id == m_ctx["merchant_id"],
        Transaction.paypal_transaction_id == paypal_tx_id
    ).count()
    assert tx_count == 1

    # 3. Transaction Summary Check
    summary_res = client.get("/api/v1/transactions/summary", headers=headers)
    assert summary_res.status_code == 200
    summ = summary_res.json()
    assert summ["transaction_count"] == 2
    assert summ["total_received"] == round(116.40 + 242.75, 2)
    assert summ["total_processor_fees"] == round(3.60 + 7.25, 2)
    assert summ["current_balance"] == round(116.40 + 242.75, 2)
