def test_user_registration_and_login(client):
    # 1. Register
    reg_payload = {
        "email": "test@merchant.com",
        "password": "SecurePassword123!",
        "full_name": "Test Merchant"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@merchant.com"
    assert data["user"]["has_merchant"] is False

    token = data["access_token"]

    # 2. Duplicate registration rejected
    res_dup = client.post("/api/v1/auth/register", json=reg_payload)
    assert res_dup.status_code == 400

    # 3. Login
    login_payload = {
        "email": "test@merchant.com",
        "password": "SecurePassword123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()

    # 4. Invalid login rejected
    res_bad = client.post("/api/v1/auth/login", json={
        "email": "test@merchant.com",
        "password": "WrongPassword!"
    })
    assert res_bad.status_code == 401

    # 5. Access /me with token
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "test@merchant.com"
