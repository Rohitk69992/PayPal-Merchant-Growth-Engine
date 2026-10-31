from datetime import datetime, timezone

def test_ml_pipeline_graceful_insufficient_data_and_execution(client):
    reg = client.post("/api/v1/auth/register", json={
        "email": "data@merchant.com",
        "password": "Password123!",
        "full_name": "Data Scientist Merchant"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/merchants/onboarding", json={
        "business_name": "Analytics Pro Store",
        "business_category": "Analytics",
        "country": "USA",
        "currency": "USD"
    }, headers=headers)

    # 1. RFM with zero customers must return INSUFFICIENT_DATA
    rfm_empty = client.get("/api/v1/analytics/rfm-segments", headers=headers).json()
    assert rfm_empty["status"] == "INSUFFICIENT_DATA"
    assert rfm_empty["customer_count"] == 0

    # 2. Add product
    prod = client.post("/api/v1/products", json={
        "sku": "DS-ITEM-1",
        "name": "Machine Learning Book",
        "category": "Education",
        "unit_cost": 15.0,
        "selling_price": 45.0,
        "current_stock": 10,
        "safety_stock": 5,
        "lead_time_days": 7
    }, headers=headers).json()
    prod_id = prod["id"]

    # 3. Forecast with zero sales must return INSUFFICIENT_DATA
    fc_empty = client.get(f"/api/v1/analytics/forecasts/{prod_id}", headers=headers).json()
    assert fc_empty["data_sufficiency_status"] == "INSUFFICIENT_DATA"

    # 4. Populate 6 days of sales data
    for i in range(1, 7):
        date_str = f"2026-10-0{i}"
        client.post("/api/v1/sales/daily", json={
            "product_id": prod_id,
            "sales_date": date_str,
            "units_sold": 4 + i
        }, headers=headers)

    # 5. Forecast now has sufficient data
    fc_sufficient = client.get(f"/api/v1/analytics/forecasts/{prod_id}", headers=headers).json()
    assert fc_sufficient["data_sufficiency_status"] == "SUFFICIENT"
    assert len(fc_sufficient["points"]) > 0
    assert fc_sufficient["historical_daily_average"] > 0

    # 6. Populate 4 customers via simulated sandbox payments
    for i in range(1, 5):
        client.post("/api/v1/paypal/simulate-sandbox-payment", params={
            "amount": 45.0 * i,
            "product_sku": "DS-ITEM-1",
            "customer_email": f"buyer{i}@test.com",
            "customer_name": f"Buyer {i}"
        }, headers=headers)

    # 7. RFM now has sufficient customers
    rfm_sufficient = client.get("/api/v1/analytics/rfm-segments", headers=headers).json()
    assert rfm_sufficient["status"] == "SUFFICIENT"
    assert len(rfm_sufficient["segments"]) > 0
