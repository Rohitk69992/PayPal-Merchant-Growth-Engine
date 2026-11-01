import pytest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.core.security import verify_password
from backend.app.models.user import (
    User,
    UserSession,
    AuthIdentity,
    PasswordResetToken,
    EmailVerificationToken,
    AuthenticationEvent,
)

client = TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_auth_registration_and_argon2_hashing(db: Session):
    unique_email = f"test_reg_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "full_name": "Test Engineer"
    }

    # 1. Successful registration
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == unique_email
    assert data["user"]["full_name"] == "Test Engineer"
    assert data["session_id"] is not None

    # Verify DB persistence directly
    user = db.query(User).filter(User.email == unique_email).first()
    assert user is not None
    assert len(user.id) == 36  # UUID format
    assert user.hashed_password.startswith("$argon2id$")
    assert verify_password("SecurePassword123!", user.hashed_password) is True

    # Verify session created
    session_rec = db.query(UserSession).filter(UserSession.id == data["session_id"]).first()
    assert session_rec is not None
    assert session_rec.user_id == user.id
    assert session_rec.is_revoked is False

    # Verify audit event
    event = db.query(AuthenticationEvent).filter(
        AuthenticationEvent.user_id == user.id,
        AuthenticationEvent.event_type == "REGISTER_SUCCESS"
    ).first()
    assert event is not None

    # 2. Duplicate registration rejected
    dup_response = client.post("/api/v1/auth/register", json=payload)
    assert dup_response.status_code == 400
    assert "already exists" in dup_response.json()["detail"]

    # Verify duplicate event logged
    dup_event = db.query(AuthenticationEvent).filter(
        AuthenticationEvent.email_attempted == unique_email,
        AuthenticationEvent.event_type == "REGISTER_FAILURE_DUPLICATE"
    ).first()
    assert dup_event is not None

def test_auth_login_lifecycle_and_failure_auditing(db: Session):
    unique_email = f"test_login_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "MySecretPassword2026!"

    # Register user first
    reg = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": pwd,
        "full_name": "Login Tester"
    })
    assert reg.status_code == 201

    # 1. Invalid password
    bad_pwd_res = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": "WrongPassword!"
    })
    assert bad_pwd_res.status_code == 401
    bad_pwd_event = db.query(AuthenticationEvent).filter(
        AuthenticationEvent.email_attempted == unique_email,
        AuthenticationEvent.event_type == "LOGIN_FAILURE_WRONG_PASSWORD"
    ).first()
    assert bad_pwd_event is not None

    # 2. Non-existent email
    bad_email_res = client.post("/api/v1/auth/login", json={
        "email": "nonexistent_person_12345@example.com",
        "password": "AnyPassword123!"
    })
    assert bad_email_res.status_code == 401
    bad_email_event = db.query(AuthenticationEvent).filter(
        AuthenticationEvent.email_attempted == "nonexistent_person_12345@example.com",
        AuthenticationEvent.event_type == "LOGIN_FAILURE_NOT_FOUND"
    ).first()
    assert bad_email_event is not None

    # 3. Successful login
    good_login = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": pwd
    })
    assert good_login.status_code == 200
    login_data = good_login.json()
    token = login_data["access_token"]

    # 4. Access /auth/me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email

def test_session_expiration_and_revocation_on_logout(db: Session):
    unique_email = f"test_session_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "SessionSecret2026!"

    reg = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": pwd,
        "full_name": "Session Tester"
    })
    token = reg.json()["access_token"]
    session_id = reg.json()["session_id"]

    # Session list check
    sess_res = client.get("/api/v1/auth/sessions", headers={"Authorization": f"Bearer {token}"})
    assert sess_res.status_code == 200
    assert len(sess_res.json()) >= 1
    assert any(s["id"] == session_id for s in sess_res.json())

    # Logout
    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # Verify session revoked in DB
    db_session = db.query(UserSession).filter(UserSession.id == session_id).first()
    assert db_session.is_revoked is True

    # Immediate rejection of revoked token
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 401
    assert "revoked" in me_res.json()["detail"].lower()

def test_password_change_and_session_invalidation(db: Session):
    unique_email = f"test_pwdchg_{uuid.uuid4().hex[:8]}@example.com"
    old_pwd = "OldPassword2026!"
    new_pwd = "NewBrandPassword2026!"

    reg = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": old_pwd,
        "full_name": "Pwd Change Tester"
    })
    token = reg.json()["access_token"]

    # Incorrect current password fails
    fail_res = client.post("/api/v1/auth/change-password", headers={"Authorization": f"Bearer {token}"}, json={
        "current_password": "WrongCurrentPassword!",
        "new_password": new_pwd
    })
    assert fail_res.status_code == 400

    # Successful password change
    succ_res = client.post("/api/v1/auth/change-password", headers={"Authorization": f"Bearer {token}"}, json={
        "current_password": old_pwd,
        "new_password": new_pwd
    })
    assert succ_res.status_code == 200

    # Verify login with new password succeeds
    login_succ = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": new_pwd
    })
    assert login_succ.status_code == 200

    # Old password no longer works
    login_fail = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": old_pwd
    })
    assert login_fail.status_code == 401

def test_password_reset_flow(db: Session):
    unique_email = f"test_reset_{uuid.uuid4().hex[:8]}@example.com"
    old_pwd = "InitialPassword2026!"
    brand_new_pwd = "BrandNewResetPassword2026!"

    client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": old_pwd,
        "full_name": "Reset Tester"
    })

    # 1. Request password reset
    forgot_res = client.post("/api/v1/auth/forgot-password", json={"email": unique_email})
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json().get("reset_token")
    assert reset_token is not None

    # Check that raw reset token is NOT in database, only SHA-256 hash is saved
    user = db.query(User).filter(User.email == unique_email).first()
    reset_rec = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).first()
    assert reset_rec is not None
    assert reset_rec.token_hash != reset_token
    assert len(reset_rec.token_hash) == 64  # SHA-256 hex string

    # 2. Reset with invalid token fails
    bad_reset = client.post("/api/v1/auth/reset-password", json={
        "token": "completely_invalid_random_token_12345",
        "new_password": brand_new_pwd
    })
    assert bad_reset.status_code == 400

    # 3. Reset with valid token succeeds
    good_reset = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": brand_new_pwd
    })
    assert good_reset.status_code == 200

    # 4. Reuse of single-use token fails
    reuse_reset = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": "AnotherPasswordAttempt!"
    })
    assert reuse_reset.status_code == 400

    # 5. Login works with newly reset password
    new_login = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": brand_new_pwd
    })
    assert new_login.status_code == 200

def test_account_deactivation(db: Session):
    unique_email = f"test_deact_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "DeactPassword2026!"

    reg = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": pwd,
        "full_name": "Deactivate Tester"
    })
    token = reg.json()["access_token"]

    # Wrong confirmation string rejected
    bad_conf = client.post("/api/v1/auth/deactivate", headers={"Authorization": f"Bearer {token}"}, json={
        "password": pwd,
        "confirmation": "NO"
    })
    assert bad_conf.status_code == 400

    # Successful deactivation
    good_deact = client.post("/api/v1/auth/deactivate", headers={"Authorization": f"Bearer {token}"}, json={
        "password": pwd,
        "confirmation": "DEACTIVATE"
    })
    assert good_deact.status_code == 200

    # Subsequent login rejected with 403 Forbidden
    login_attempt = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": pwd
    })
    assert login_attempt.status_code == 403
    assert "deactivated" in login_attempt.json()["detail"].lower()

def test_google_auth_configuration_and_linking(db: Session):
    # 1. When GOOGLE_CLIENT_ID is not configured, returns 503
    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", ""):
        res = client.post("/api/v1/auth/google", json={"id_token": "dummy_token"})
        assert res.status_code == 503
        assert "not configured" in res.json()["detail"].lower()

    # 2. When configured with valid mock ID token
    google_sub = f"google_sub_{uuid.uuid4().hex[:12]}"
    google_email = f"google_user_{uuid.uuid4().hex[:8]}@gmail.com"

    mock_id_info = {
        "iss": "accounts.google.com",
        "sub": google_sub,
        "email": google_email,
        "email_verified": True,
        "name": "Google Verified User"
    }

    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com"), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        # First sign-in creates user and links identity
        auth_res = client.post("/api/v1/auth/google", json={"id_token": "mock_valid_token"})
        assert auth_res.status_code == 200
        auth_data = auth_res.json()
        assert auth_data["user"]["email"] == google_email
        assert auth_data["user"]["is_verified"] is True

        # Second sign-in with same Google sub reuses the same user without duplicate account
        auth_res_2 = client.post("/api/v1/auth/google", json={"id_token": "mock_valid_token"})
        assert auth_res_2.status_code == 200
        assert auth_res_2.json()["user"]["id"] == auth_data["user"]["id"]

        # Verify DB identity
        ident = db.query(AuthIdentity).filter(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_subject_id == google_sub
        ).first()
        assert ident is not None
        assert ident.user_id == auth_data["user"]["id"]
