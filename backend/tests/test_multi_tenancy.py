def test_multi_tenant_isolation(client):
    # Register User A & Merchant A
    res_a = client.post("/api/v1/auth/register", json={
        "email": "user_a@store.com",
        "password": "Password123!",
        "full_name": "Merchant A"
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_ob_a = client.post("/api/v1/merchants/onboarding", json={
        "business_name": "Store Alpha",
        "business_category": "Electronics",
        "country": "USA",
        "currency": "USD"
    }, headers=headers_a)
    assert res_ob_a.status_code == 201
    merchant_a_id = res_ob_a.json()["id"]

    # Register User B & Merchant B
    res_b = client.post("/api/v1/auth/register", json={
        "email": "user_b@store.com",
        "password": "Password123!",
        "full_name": "Merchant B"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    res_ob_b = client.post("/api/v1/merchants/onboarding", json={
        "business_name": "Store Beta",
        "business_category": "Apparel",
        "country": "USA",
        "currency": "USD"
    }, headers=headers_b)
    assert res_ob_b.status_code == 201
    merchant_b_id = res_ob_b.json()["id"]

    assert merchant_a_id != merchant_b_id

    # Merchant A creates a product
    prod_a = client.post("/api/v1/products", json={
        "sku": "PROD-ALPHA-1",
        "name": "Alpha Headphones",
        "category": "Electronics",
        "unit_cost": 40.0,
        "selling_price": 99.0,
        "current_stock": 50,
        "safety_stock": 10,
        "lead_time_days": 5
    }, headers=headers_a)
    assert prod_a.status_code == 201
    prod_a_id = prod_a.json()["id"]

    # Merchant B creates a product
    prod_b = client.post("/api/v1/products", json={
        "sku": "PROD-BETA-1",
        "name": "Beta Jacket",
        "category": "Apparel",
        "unit_cost": 25.0,
        "selling_price": 60.0,
        "current_stock": 30,
        "safety_stock": 5,
        "lead_time_days": 7
    }, headers=headers_b)
    assert prod_b.status_code == 201

    # Verify Merchant A ONLY sees Alpha Headphones
    list_a = client.get("/api/v1/products", headers=headers_a).json()
    assert len(list_a) == 1
    assert list_a[0]["sku"] == "PROD-ALPHA-1"

    # Verify Merchant B ONLY sees Beta Jacket
    list_b = client.get("/api/v1/products", headers=headers_b).json()
    assert len(list_b) == 1
    assert list_b[0]["sku"] == "PROD-BETA-1"

    # Verify Merchant B CANNOT view or access Merchant A's product details
    res_cross = client.get(f"/api/v1/products/{prod_a_id}", headers=headers_b)
    assert res_cross.status_code == 404
