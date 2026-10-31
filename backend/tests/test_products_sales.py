def test_products_and_daily_sales_lifecycle(client):
    # Setup merchant
    reg = client.post("/api/v1/auth/register", json={
        "email": "ops@merchant.com",
        "password": "Password123!",
        "full_name": "Operations Lead"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/merchants/onboarding", json={
        "business_name": "Gear Store",
        "business_category": "Retail",
        "country": "USA",
        "currency": "USD"
    }, headers=headers)

    # 1. Starts with empty products
    init_prods = client.get("/api/v1/products", headers=headers).json()
    assert len(init_prods) == 0

    # 2. Add product
    prod_res = client.post("/api/v1/products", json={
        "sku": "WATCH-01",
        "name": "GPS Smart Watch",
        "category": "Electronics",
        "unit_cost": 50.0,
        "selling_price": 120.0,
        "current_stock": 20,
        "safety_stock": 10,
        "lead_time_days": 10
    }, headers=headers)
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # 3. Record daily sale (5 units sold)
    sale_res = client.post("/api/v1/sales/daily", json={
        "product_id": prod_id,
        "sales_date": "2026-10-25",
        "units_sold": 5
    }, headers=headers)
    assert sale_res.status_code == 201

    # Verify product stock automatically deducted from 20 -> 15
    updated_prod = client.get(f"/api/v1/products/{prod_id}", headers=headers).json()
    assert updated_prod["current_stock"] == 15

    # 4. Create Purchase Order draft for 25 units
    po_res = client.post("/api/v1/inventory/purchase-orders", json={
        "product_id": prod_id,
        "quantity": 25
    }, headers=headers)
    assert po_res.status_code == 201
    po_id = po_res.json()["id"]

    # 5. Receive Purchase Order -> stock replenished from 15 -> 40
    rcv_res = client.post(f"/api/v1/inventory/purchase-orders/{po_id}/receive", headers=headers)
    assert rcv_res.status_code == 200
    assert rcv_res.json()["new_stock"] == 40
