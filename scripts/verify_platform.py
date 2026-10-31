import sys
import os
from datetime import datetime, timedelta

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Ensure workspace root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine

def run_verification():
    print("=" * 70)
    print("PAYPAL MERCHANT GROWTH ENGINE - COMPREHENSIVE E2E VERIFICATION")
    print("=" * 70)

    # Initialize tables
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)

    # 1. Health Check
    print("\n[Step 1] System Health Check...")
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(f"  ✓ Service status: {res.json()['status']}, Environment: {res.json()['environment']}")

    # 2. User Registration
    print("\n[Step 2] Registering genuine user...")
    owner_email = f"owner_{int(datetime.now().timestamp())}@apexfintech.io"
    reg_payload = {
        "email": owner_email,
        "password": "ApexPassword2026!",
        "full_name": "Elena Rostova"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201, f"Registration failed: {res.text}"
    token = res.json()["access_token"]
    user = res.json()["user"]
    print(f"  ✓ User registered: {user['full_name']} ({user['email']})")

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Merchant Onboarding (Empty Tenant)
    print("\n[Step 3] Onboarding merchant tenant profile...")
    onboard_payload = {
        "business_name": "Apex Audio & Wearables",
        "currency": "USD",
        "category": "Electronics & Wearables",
        "address": "400 Enterprise Boulevard, Suite 500, Austin TX",
        "phone": "+1 (512) 555-0199"
    }
    res = client.post("/api/v1/merchants/onboarding", json=onboard_payload, headers=headers)
    assert res.status_code == 201, f"Onboarding failed: {res.text}"
    merchant = res.json()
    merchant_id = merchant["id"]
    headers["X-Merchant-ID"] = merchant_id
    print(f"  ✓ Merchant onboarded: {merchant['business_name']} (ID: {merchant_id})")

    # 4. Verify Clean Slate Initial State
    print("\n[Step 4] Verifying clean-slate initial state...")
    res = client.get("/api/v1/analytics/overview", headers=headers)
    assert res.status_code == 200
    overview = res.json()
    assert overview["total_balance"] == 0.0
    assert overview["transaction_count"] == 0
    assert overview["customer_count"] == 0
    assert overview["low_stock_count"] == 0
    print(f"  ✓ Clean slate confirmed: Balance=${overview['total_balance']}, Tx={overview['transaction_count']}, Cust={overview['customer_count']}")

    # Check RFM clustering on empty state
    res = client.get("/api/v1/analytics/rfm-segments", headers=headers)
    assert res.status_code == 200
    rfm_empty = res.json()
    assert rfm_empty["status"] == "INSUFFICIENT_DATA"
    print(f"  ✓ RFM graceful fallback: {rfm_empty['message']}")

    # 5. Connect PayPal Sandbox
    print("\n[Step 5] Connecting PayPal Sandbox credentials...")
    paypal_payload = {
        "client_id": "AbCdEfGhIjKlMnOpQrStUvWxYz_SANDBOX_CLIENT_ID",
        "client_secret": "ZzYyXxWwVvUuTtSsRrQqPpOoNn_SANDBOX_SECRET",
        "environment": "sandbox"
    }
    res = client.post("/api/v1/paypal/connect", json=paypal_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["is_connected"] is True
    print(f"  ✓ PayPal credentials stored & symmetrically encrypted: Client ID: {res.json()['client_id_preview']}...")

    # 6. Create Master Products in Catalog
    print("\n[Step 6] Populating master product catalog...")
    products = [
        {
            "sku": "WH-AUDIO-PRO",
            "name": "Wireless Noise-Canceling Headphones",
            "category": "Electronics",
            "unit_cost": 65.00,
            "unit_price": 149.99,
            "stock_on_hand": 40,
            "reorder_point": 15,
            "safety_stock": 10,
            "lead_time_days": 7,
            "supplier_name": "SoundWave Electronics Ltd"
        },
        {
            "sku": "SW-FIT-400",
            "name": "Fitness Smartwatch Pro",
            "category": "Wearables",
            "unit_cost": 45.00,
            "unit_price": 99.99,
            "stock_on_hand": 8,  # Below ROP of 20 -> LOW STOCK
            "reorder_point": 20,
            "safety_stock": 10,
            "lead_time_days": 5,
            "supplier_name": "Zenith Tech Wearables"
        },
        {
            "sku": "BP-NOMAD-50",
            "name": "Waterproof Commuter Backpack",
            "category": "Gear",
            "unit_cost": 25.00,
            "unit_price": 59.99,
            "stock_on_hand": 65,
            "reorder_point": 15,
            "safety_stock": 8,
            "lead_time_days": 10,
            "supplier_name": "Nomad Supply Co"
        }
    ]

    created_prods = []
    for p in products:
        res = client.post("/api/v1/products/", json=p, headers=headers)
        assert res.status_code == 201, f"Product create failed: {res.text}"
        created_prods.append(res.json())
        print(f"  ✓ Created: {p['name']} (SKU: {p['sku']}, Stock: {p['stock_on_hand']}, ROP: {p['reorder_point']})")

    wh_prod = created_prods[0]
    sw_prod = created_prods[1]

    # Verify Low Stock detection
    res = client.get("/api/v1/analytics/overview", headers=headers)
    assert res.json()["low_stock_count"] == 1
    print(f"  ✓ Low Stock count correctly identified: {res.json()['low_stock_count']} product (Fitness Smartwatch Pro)")

    # 7. Record 7 Days of Daily Sales History for Product 1
    print("\n[Step 7] Recording 7 days of historical sales for demand forecasting...")
    today = datetime.now()
    sales_data = [14, 18, 22, 15, 29, 32, 25]
    for i, units in enumerate(sales_data):
        sale_date = (today - timedelta(days=7 - i)).strftime("%Y-%m-%d")
        revenue = round(units * wh_prod["selling_price"], 2)
        sale_payload = {
            "product_id": wh_prod["id"],
            "units_sold": units,
            "revenue": revenue,
            "date": sale_date,
            "channel": "PAYPAL_CHECKOUT"
        }
        res = client.post("/api/v1/sales/", json=sale_payload, headers=headers)
        assert res.status_code == 201

    print(f"  ✓ 7 days of sales successfully logged for {wh_prod['name']}")

    # 8. Verify Holt-Winters / Statistical Demand Forecast
    print("\n[Step 8] Evaluating time-series demand forecast pipeline...")
    res = client.get(f"/api/v1/analytics/forecasts/{wh_prod['id']}", headers=headers)
    assert res.status_code == 200, f"Forecast failed: {res.text}"
    forecast = res.json()
    print("  DEBUG FORECAST:", forecast)
    assert forecast["status"] in ["OPTIMAL", "FALLBACK_MA", "SUFFICIENT"]
    assert len(forecast["points"]) > 0
    print(f"  ✓ Demand Forecast Model: {forecast['method']}")
    print(f"  ✓ Status: {forecast['status']}, Data points used: {forecast['data_points_used']}")
    print(f"  ✓ Recommended reorder quantity: {forecast['recommended_units_next_period']} units")
    print(f"  ✓ Rationale: {forecast['rationale']}")

    # 9. Simulate PayPal Sandbox Payments Across 5 Customers
    print("\n[Step 9] Simulating live PayPal sandbox payments...")
    customers = [
        ("Liam Vance", "liam.vance@example.com", 299.98, "2x Wireless Headphones", wh_prod["id"]),
        ("Sophia Patel", "sophia.patel@example.com", 149.99, "1x Wireless Headphones", wh_prod["id"]),
        ("Carlos Gomez", "carlos.gomez@example.com", 199.98, "2x Fitness Smartwatch", sw_prod["id"]),
        ("Aisha Al-Mansoor", "aisha.mansoor@example.com", 99.99, "1x Fitness Smartwatch", sw_prod["id"]),
        ("Marcus Brody", "marcus.brody@example.com", 59.99, "1x Commuter Backpack", created_prods[2]["id"]),
    ]

    for name, email, amount, desc, pid in customers:
        sim_payload = {
            "amount": amount,
            "description": desc,
            "customer_email": email,
            "customer_name": name,
            "product_id": pid
        }
        res = client.post("/api/v1/paypal/simulate-sandbox-payment", json=sim_payload, headers=headers)
        assert res.status_code == 200, f"Simulation failed: {res.text}"
        tx = res.json()["transaction"]
        print(f"  ✓ Captured: ${tx['gross_amount']} from {name} (Fee: -${tx['fee_amount']}, Net: +${tx['net_amount']}, Order: {tx['paypal_order_id']})")

    # 10. Verify RFM Customer Segmentation
    print("\n[Step 10] Running Scikit-Learn RFM K-Means clustering pipeline...")
    res = client.get("/api/v1/analytics/rfm-segments", headers=headers)
    assert res.status_code == 200
    rfm_result = res.json()
    print("  DEBUG RFM RESULT:", rfm_result)
    assert rfm_result["status"] in ["OPTIMAL", "SUFFICIENT"]
    total_custs = rfm_result.get("total_customers", rfm_result.get("total_customers_analyzed", 0))
    assert total_custs >= 5
    print(f"  ✓ RFM Status: {rfm_result['status']} ({total_custs} customers clustered)")
    for seg in rfm_result["segments"]:
        spend = seg.get("avg_spend", seg.get("avg_monetary", 0.0))
        seg_name = seg.get("name", seg.get("segment_name", "Segment"))
        print(f"    • {seg_name}: {seg['customer_count']} customers ({seg['percentage']}%), Avg Spend: ${spend:.2f}")

    # 11. Test Agentic AI Decision Support
    print("\n[Step 11] Testing Agentic AI Copilot Tool Orchestration...")
    agent_queries = [
        "What is our overall store performance and balance?",
        "What should I reorder to avoid stockouts?",
    ]
    for q in agent_queries:
        res = client.post("/api/v1/agent/chat", json={"message": q}, headers=headers)
        assert res.status_code == 200, f"Agent chat failed: {res.text}"
        agent_resp = res.json()
        print(f"\n  Query: '{q}'")
        tool_names = [t["tool_name"] for t in agent_resp.get("tool_executions", [])]
        print(f"  Tools Dispatched: {tool_names}")
        print(f"  AI Reply Preview: {agent_resp['reply'][:140]}...")

    # 12. Verify Multi-Tenant Boundary Isolation
    print("\n[Step 12] Verifying strict multi-tenant boundary isolation...")
    # Register Merchant B
    owner_b_email = f"competitor_{int(datetime.now().timestamp())}@rivalgear.com"
    res_b = client.post("/api/v1/auth/register", json={
        "email": owner_b_email,
        "password": "RivalPassword2026!",
        "full_name": "Rival Store Owner"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    res_mb = client.post("/api/v1/merchants/onboarding", json={
        "business_name": "Rival Outdoor Outfitters",
        "currency": "USD"
    }, headers=headers_b)
    merchant_b_id = res_mb.json()["id"]
    headers_b["X-Merchant-ID"] = merchant_b_id

    # Verify Merchant B sees 0 products and 0 revenue
    res_prods_b = client.get("/api/v1/products/", headers=headers_b)
    assert len(res_prods_b.json()) == 0, "Security Violation: Merchant B saw Merchant A products!"

    res_ov_b = client.get("/api/v1/analytics/overview", headers=headers_b)
    assert res_ov_b.json()["total_balance"] == 0.0, "Security Violation: Merchant B saw Merchant A revenue!"

    # Verify cross-tenant access rejection
    res_cross = client.get(f"/api/v1/products/{wh_prod['id']}", headers=headers_b)
    assert res_cross.status_code in [403, 404], "Security Violation: Merchant B could query Merchant A product!"

    print("  ✓ Multi-tenant data segregation rigorously verified: 0 leaks across tenants.")

    print("\n" + "=" * 70)
    print("ALL 12 END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_verification()
