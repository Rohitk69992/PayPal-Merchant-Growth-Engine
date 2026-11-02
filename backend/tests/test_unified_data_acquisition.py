import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.user import User, MerchantProfile, MerchantMember
from backend.app.models.inventory import Product, DailySale, InventoryMovement
from backend.app.models.transaction import Transaction, Customer, Order, OrderItem, DataImportJob
from backend.app.models.paypal import WebhookEvent

client = TestClient(app)

def create_tenant(prefix: str):
    email = f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "SecureUser2026!"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": f"{prefix.capitalize()} Owner"
    })
    assert reg.status_code == 201, reg.text
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]

    m_res = client.post("/api/v1/merchants/onboarding", json={
        "business_name": f"{prefix.capitalize()} Enterprise",
        "category": "Retail",
        "country": "USA",
        "currency": "USD"
    }, headers={"Authorization": f"Bearer {token}"})
    assert m_res.status_code == 201, m_res.text
    merchant_id = m_res.json()["id"]

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Merchant-ID": merchant_id
    }
    return {
        "email": email,
        "token": token,
        "user_id": user_id,
        "merchant_id": merchant_id,
        "headers": headers
    }


def test_manual_sale_entry_and_inventory_decrement():
    tenant = create_tenant("manual_sales")
    headers = tenant["headers"]

    # 1. Create a product with stock = 20
    prod_res = client.post("/api/v1/products", json={
        "sku": f"MANUAL-{uuid.uuid4().hex[:6].upper()}",
        "name": "Wireless Ergonomic Mouse",
        "category": "Electronics",
        "unit_cost": 25.0,
        "selling_price": 59.99,
        "current_stock": 20,
        "safety_stock": 5
    }, headers=headers)
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]
    prod_sku = prod_res.json()["sku"]

    # 2. Insufficient stock check: try to sell 25 units with deduct_inventory=True
    fail_res = client.post("/api/v1/sales/manual", json={
        "product_id": prod_id,
        "quantity": 25,
        "deduct_inventory": True,
        "transaction_status": "COMPLETED"
    }, headers=headers)
    assert fail_res.status_code == 400
    assert "insufficient inventory" in fail_res.json()["detail"].lower()

    # 3. Successful manual sale: 3 units
    sale_res = client.post("/api/v1/sales/manual", json={
        "product_id": prod_id,
        "quantity": 3,
        "unit_price": 59.99,
        "customer_email": "buyer.alice@customer.com",
        "customer_name": "Alice Wonderland",
        "customer_city": "Austin",
        "payment_method": "CASH",
        "transaction_status": "COMPLETED",
        "deduct_inventory": True
    }, headers=headers)
    assert sale_res.status_code == 201
    sale_data = sale_res.json()
    assert sale_data["gross_amount"] == 179.97
    assert sale_data["payment_source"] == "MANUAL_CASH"
    assert sale_data["status"] == "COMPLETED"

    # 4. Verify inventory was decremented from 20 to 17
    updated_prod = client.get(f"/api/v1/products/{prod_id}", headers=headers).json()
    assert updated_prod["current_stock"] == 17

    # 5. Verify customer was created and tracked
    cust_res = client.get("/api/v1/transactions/customers", headers=headers)
    assert cust_res.status_code == 200
    customers = cust_res.json()
    assert any(c["email"] == "buyer.alice@customer.com" for c in customers)


def test_csv_preview_and_validation():
    tenant = create_tenant("csv_preview")
    headers = tenant["headers"]

    # Create catalog product
    sku = f"PREV-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/products", json={
        "sku": sku,
        "name": "Preview Test Widget",
        "unit_cost": 10.0,
        "selling_price": 25.0,
        "current_stock": 50
    }, headers=headers)

    # Insert a dummy transaction to test duplicate detection
    client.post("/api/v1/sales/manual", json={
        "sku": sku,
        "quantity": 1,
        "unit_price": 25.0,
        "payment_method": "CARD"
    }, headers=headers)

    csv_data = f"""date,sku,product_name,quantity,unit_price,total_amount,currency,customer_email,customer_name,payment_method,status,external_id
2026-10-15,{sku},Preview Test Widget,2,25.00,50.00,USD,valid@user.com,Valid User,CARD,COMPLETED,TXN-VALID-01
invalid-date,{sku},Preview Test Widget,1,25.00,25.00,USD,bad@user.com,Bad Date,CARD,COMPLETED,TXN-BAD-DATE
2026-10-16,{sku},Preview Test Widget,-5,25.00,25.00,USD,badqty@user.com,Bad Qty,CARD,COMPLETED,TXN-BAD-QTY
"""

    preview_res = client.post("/api/v1/sales/csv-preview", json={"csv_content": csv_data}, headers=headers)
    assert preview_res.status_code == 200
    preview = preview_res.json()

    assert preview["total_rows"] == 3
    assert preview["valid_rows_count"] == 1
    assert preview["invalid_rows_count"] == 2
    assert len(preview["errors"]) == 2
    assert any("date" in err["field"] for err in preview["errors"])
    assert any("quantity" in err["field"] for err in preview["errors"])


def test_csv_import_historical_inventory_preservation():
    tenant = create_tenant("csv_hist")
    headers = tenant["headers"]

    # Create catalog product with stock = 100
    sku = f"HIST-{uuid.uuid4().hex[:6].upper()}"
    prod_res = client.post("/api/v1/products", json={
        "sku": sku,
        "name": "Historical Reference Book",
        "unit_cost": 12.0,
        "selling_price": 30.0,
        "current_stock": 100,
        "safety_stock": 10
    }, headers=headers)
    prod_id = prod_res.json()["id"]

    # Import historical sales from 6 months ago with deduct_inventory=False
    csv_data = f"""date,sku,product_name,quantity,unit_price,total_amount,currency,customer_email,customer_name,payment_method,status,external_id
2026-05-01,{sku},Historical Reference Book,10,30.00,300.00,USD,buyer1@hist.com,Buyer One,PAYPAL,COMPLETED,HIST-TXN-001
2026-05-02,{sku},Historical Reference Book,15,30.00,450.00,USD,buyer2@hist.com,Buyer Two,PAYPAL,COMPLETED,HIST-TXN-002
2026-05-03,{sku},Historical Reference Book,20,30.00,600.00,USD,buyer3@hist.com,Buyer Three,PAYPAL,COMPLETED,HIST-TXN-003
"""

    import_res = client.post(
        "/api/v1/sales/import-csv?deduct_inventory=false&skip_duplicates=true",
        json={"csv_content": csv_data, "filename": "historical_spring_2026.csv"},
        headers=headers
    )
    assert import_res.status_code == 200
    summary = import_res.json()
    assert summary["imported_records"] == 3
    assert summary["failed_records"] == 0
    assert summary["status"] == "COMPLETED"

    # CRITICAL: Verify current stock was NOT changed (remains 100)
    prod_check = client.get(f"/api/v1/products/{prod_id}", headers=headers).json()
    assert prod_check["current_stock"] == 100, "Historical imports must not falsify present-day inventory stock!"

    # Verify import history was logged
    history_res = client.get("/api/v1/sales/import-history", headers=headers)
    assert history_res.status_code == 200
    history_list = history_res.json()
    assert len(history_list) >= 1
    assert history_list[0]["filename"] == "historical_spring_2026.csv"
    assert history_list[0]["imported_records"] == 3


def test_csv_import_deduplication():
    tenant = create_tenant("csv_dedup")
    headers = tenant["headers"]

    sku = f"DEDUP-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/v1/products", json={
        "sku": sku,
        "name": "Deduplication Item",
        "selling_price": 50.0
    }, headers=headers)

    csv_data = f"""date,sku,quantity,total_amount,external_id
2026-10-20,{sku},2,100.00,EXT-UNIQUE-999
"""

    # First import -> 1 record ingested
    res1 = client.post("/api/v1/sales/import-csv?skip_duplicates=true", json={"csv_content": csv_data}, headers=headers)
    assert res1.json()["imported_records"] == 1
    assert res1.json()["skipped_duplicates"] == 0

    # Repeated import of same CSV -> 0 ingested, 1 skipped duplicate
    res2 = client.post("/api/v1/sales/import-csv?skip_duplicates=true", json={"csv_content": csv_data}, headers=headers)
    assert res2.json()["imported_records"] == 0
    assert res2.json()["skipped_duplicates"] == 1

    # Total transaction count remains 1
    txs = client.get("/api/v1/transactions", headers=headers).json()
    matching_txs = [t for t in txs if t["external_reference_id"] == "EXT-UNIQUE-999"]
    assert len(matching_txs) == 1, "Duplicate import must not create duplicate transaction rows!"


def test_paypal_webhook_idempotency_and_refunds():
    tenant = create_tenant("webhook_test")
    headers = tenant["headers"]

    # 1. First webhook: PAYMENT.CAPTURE.COMPLETED
    event_id = f"WH-EVENT-{uuid.uuid4().hex}"
    capture_id = f"CAPTURE-{uuid.uuid4().hex[:10]}"
    webhook_payload = {
        "id": event_id,
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource_type": "capture",
        "summary": "Payment capture completed",
        "resource": {
            "id": capture_id,
            "custom_id": tenant["merchant_id"],
            "amount": {"value": "150.00", "currency_code": "USD"},
            "seller_receivable_breakdown": {
                "paypal_fee": {"value": "4.65"}
            },
            "payer": {
                "email_address": "payer.webhook@test.com",
                "name": {"given_name": "Webhook", "surname": "Tester"}
            }
        }
    }

    wh_res1 = client.post("/api/v1/paypal/webhooks", json=webhook_payload)
    assert wh_res1.status_code == 200
    assert wh_res1.json()["status"] == "PROCESSED"

    # 2. Duplicate webhook with same event_id -> DUPLICATE_IGNORED
    wh_res2 = client.post("/api/v1/paypal/webhooks", json=webhook_payload)
    assert wh_res2.status_code == 200
    assert wh_res2.json()["status"] == "DUPLICATE_IGNORED"

    # Verify transaction ledger has exactly 1 transaction for capture_id
    txs = client.get("/api/v1/transactions", headers=headers).json()
    matching = [t for t in txs if t["paypal_transaction_id"] == capture_id or t["external_reference_id"] == capture_id]
    assert len(matching) == 1
    assert matching[0]["gross_amount"] == 150.00
    assert matching[0]["status"] == "COMPLETED"

    # 3. Refund Webhook: PAYMENT.CAPTURE.REFUNDED
    refund_event_id = f"WH-REFUND-{uuid.uuid4().hex}"
    refund_id = f"REFUND-{uuid.uuid4().hex[:10]}"
    refund_payload = {
        "id": refund_event_id,
        "event_type": "PAYMENT.CAPTURE.REFUNDED",
        "resource_type": "refund",
        "summary": "Payment refunded",
        "resource": {
            "id": refund_id,
            "parent_payment": capture_id,
            "custom_id": tenant["merchant_id"],
            "amount": {"value": "150.00", "currency_code": "USD"}
        }
    }

    ref_res = client.post("/api/v1/paypal/webhooks", json=refund_payload)
    assert ref_res.status_code == 200

    # Verify original transaction was updated to REFUNDED
    txs_after = client.get("/api/v1/transactions", headers=headers).json()
    orig = next(t for t in txs_after if t["paypal_transaction_id"] == capture_id or t["external_reference_id"] == capture_id)
    assert orig["status"] == "REFUNDED"


def test_revenue_calculation_excludes_pending_failed_refunded():
    tenant = create_tenant("rev_calc")
    headers = tenant["headers"]

    # Ingest Completed Sale ($100 gross, $0 fee)
    client.post("/api/v1/sales/manual", json={
        "total_amount": 100.0,
        "transaction_status": "COMPLETED",
        "payment_method": "CASH"
    }, headers=headers)

    # Ingest Pending Sale ($200) -> must NOT be included in revenue
    client.post("/api/v1/sales/manual", json={
        "total_amount": 200.0,
        "transaction_status": "PENDING",
        "payment_method": "BANK_TRANSFER"
    }, headers=headers)

    # Ingest Refunded Sale ($50) -> must NOT be included in completed revenue
    client.post("/api/v1/sales/manual", json={
        "total_amount": 50.0,
        "transaction_status": "REFUNDED",
        "payment_method": "CASH"
    }, headers=headers)

    # Summary checks
    summary = client.get("/api/v1/transactions/summary", headers=headers).json()
    assert summary["total_received"] == 100.0, f"Expected 100.0 completed revenue, got {summary['total_received']}"

    # Analytics Overview checks
    overview = client.get("/api/v1/analytics/overview", headers=headers).json()
    assert overview["gross_sales_30d"] == 100.0, f"Expected 100.0 gross 30d sales, got {overview['gross_sales_30d']}"


def test_multi_tenant_isolation_for_unified_transactions():
    alice = create_tenant("alice_multi")
    bob = create_tenant("bob_multi")

    # Alice records a manual sale and imports CSV
    client.post("/api/v1/sales/manual", json={
        "total_amount": 349.99,
        "customer_email": "alice_customer@secret.com",
        "transaction_status": "COMPLETED",
        "payment_method": "CASH"
    }, headers=alice["headers"])

    # Alice imports a CSV
    client.post("/api/v1/sales/import-csv", json={
        "csv_content": "date,quantity,total_amount,customer_email,external_id\n2026-10-18,1,99.00,alice_csv@domain.com,ALICE-CSV-TXN\n",
        "filename": "alice_private_data.csv"
    }, headers=alice["headers"])

    # 1. Bob queries transactions -> sees 0 of Alice's records
    bob_txs = client.get("/api/v1/transactions", headers=bob["headers"]).json()
    assert len(bob_txs) == 0

    # 2. Bob queries summary -> 0 balance
    bob_sum = client.get("/api/v1/transactions/summary", headers=bob["headers"]).json()
    assert bob_sum["total_received"] == 0.0
    assert bob_sum["transaction_count"] == 0

    # 3. Bob queries customers -> 0 customers
    bob_custs = client.get("/api/v1/transactions/customers", headers=bob["headers"]).json()
    assert len(bob_custs) == 0

    # 4. Bob queries import history -> 0 import jobs
    bob_hist = client.get("/api/v1/sales/import-history", headers=bob["headers"]).json()
    assert len(bob_hist) == 0

    # 5. Bob tries to access Alice's transactions via header spoofing -> HTTP 403
    spoofed = {
        "Authorization": f"Bearer {bob['token']}",
        "X-Merchant-ID": alice["merchant_id"]
    }
    spoof_res = client.get("/api/v1/transactions", headers=spoofed)
    assert spoof_res.status_code == 403
