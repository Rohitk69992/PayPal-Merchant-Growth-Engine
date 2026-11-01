import pytest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.models.user import (
    User,
    UserSession,
    AuthIdentity,
    AuthenticationEvent,
    MerchantProfile,
    MerchantMember,
)

TEST_CLIENT_ID = "test-google-client-id-12345.apps.googleusercontent.com"

def test_google_oauth_unconfigured_client_id_returns_503(client):
    """When GOOGLE_CLIENT_ID is empty/unconfigured, returns 503 SERVICE_UNAVAILABLE."""
    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", ""):
        res = client.post("/api/v1/auth/google", json={"id_token": "any_token"})
        assert res.status_code == 503
        assert "not configured" in res.json()["detail"].lower()

def test_google_oauth_invalid_token_returns_401_and_records_audit(client, db_session: Session):
    """Invalid token signature/format rejected with 401 and logged in authentication_events."""
    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", side_effect=ValueError("Invalid token signature")):
        
        res = client.post("/api/v1/auth/google", json={"id_token": "tampered.jwt.signature"})
        assert res.status_code == 401
        assert "verification failed" in res.json()["detail"].lower()

        # Confirm audit event was recorded without logging sensitive token
        audit = db_session.query(AuthenticationEvent).filter(
            AuthenticationEvent.event_type == "GOOGLE_LOGIN_FAILURE"
        ).order_by(AuthenticationEvent.created_at.desc()).first()
        assert audit is not None
        assert "tampered" not in audit.email_attempted

def test_google_oauth_expired_token_returns_401(client):
    """Expired Google ID token is rejected with 401."""
    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", side_effect=ValueError("Token expired")):
        
        res = client.post("/api/v1/auth/google", json={"id_token": "expired.jwt.token"})
        assert res.status_code == 401
        assert "token expired" in res.json()["detail"].lower()

def test_google_oauth_audience_mismatch_returns_401(client):
    """Token issued for a different Google Client ID is rejected with 401."""
    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", side_effect=ValueError("Wrong recipient, payload audience doesn't match")):
        
        res = client.post("/api/v1/auth/google", json={"id_token": "wrong_aud.jwt.token"})
        assert res.status_code == 401
        assert "audience" in res.json()["detail"].lower()

def test_google_oauth_invalid_issuer_returns_401(client):
    """Token from untrusted issuer is rejected with 401."""
    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", side_effect=ValueError("Invalid Google token issuer.")):
        
        res = client.post("/api/v1/auth/google", json={"id_token": "phishing.issuer.token"})
        assert res.status_code == 401
        assert "issuer" in res.json()["detail"].lower()

def test_google_oauth_unverified_email_returns_400_and_records_audit(client, db_session: Session):
    """Google account with email_verified=False is rejected with 400 and logged."""
    unverified_email = f"unverified_{uuid.uuid4().hex[:8]}@example.com"
    mock_id_info = {
        "iss": "https://accounts.google.com",
        "sub": f"sub_{uuid.uuid4().hex[:12]}",
        "email": unverified_email,
        "email_verified": False,
        "name": "Unverified User"
    }

    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        res = client.post("/api/v1/auth/google", json={"id_token": "mock_unverified_token"})
        assert res.status_code == 400
        assert "not verified" in res.json()["detail"].lower()

        # Audit event checked
        audit = db_session.query(AuthenticationEvent).filter(
            AuthenticationEvent.event_type == "GOOGLE_LOGIN_FAILURE_UNVERIFIED_EMAIL",
            AuthenticationEvent.email_attempted == unverified_email
        ).first()
        assert audit is not None

def test_google_oauth_incomplete_payload_returns_400(client):
    """Payload missing 'sub' or 'email' is rejected."""
    mock_id_info = {
        "iss": "https://accounts.google.com",
        "sub": "",  # missing sub
        "email": "test@gmail.com",
        "email_verified": True
    }
    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        res = client.post("/api/v1/auth/google", json={"id_token": "missing_sub_token"})
        assert res.status_code == 400
        assert "incomplete identity" in res.json()["detail"].lower()

def test_google_oauth_new_user_success_persists_user_identity_session(client, db_session: Session):
    """First-time Google user creates User, AuthIdentity, UserSession, and audit event."""
    google_sub = f"goog_sub_{uuid.uuid4().hex[:12]}"
    google_email = f"first_time_{uuid.uuid4().hex[:8]}@gmail.com"
    user_name = "Alex Morgan"

    mock_id_info = {
        "iss": "accounts.google.com",
        "sub": google_sub,
        "email": google_email,
        "email_verified": True,
        "name": user_name
    }

    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        res = client.post("/api/v1/auth/google", json={"id_token": "valid_token"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == google_email
        assert data["user"]["full_name"] == user_name
        assert data["user"]["is_verified"] is True
        assert data["user"]["has_merchant"] is False  # New user has no workspace yet

        user_id = data["user"]["id"]
        session_id = data["session_id"]

        # Directly verify database persistence
        db_user = db_session.query(User).filter(User.id == user_id).first()
        assert db_user is not None
        assert db_user.email == google_email
        assert db_user.is_active is True

        db_ident = db_session.query(AuthIdentity).filter(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_subject_id == google_sub
        ).first()
        assert db_ident is not None
        assert db_ident.user_id == user_id
        assert db_ident.email == google_email

        db_session_rec = db_session.query(UserSession).filter(UserSession.id == session_id).first()
        assert db_session_rec is not None
        assert db_session_rec.user_id == user_id
        assert db_session_rec.is_revoked is False

        audit = db_session.query(AuthenticationEvent).filter(
            AuthenticationEvent.user_id == user_id,
            AuthenticationEvent.event_type == "GOOGLE_LOGIN_SUCCESS"
        ).first()
        assert audit is not None

def test_google_oauth_returning_user_reuses_identity_creates_new_session(client, db_session: Session):
    """Returning Google user retrieves existing user and creates a new revocable session."""
    google_sub = f"goog_sub_{uuid.uuid4().hex[:12]}"
    google_email = f"returning_{uuid.uuid4().hex[:8]}@gmail.com"

    mock_id_info = {
        "iss": "https://accounts.google.com",
        "sub": google_sub,
        "email": google_email,
        "email_verified": True,
        "name": "Returning Merchant"
    }

    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        # 1. First login
        res1 = client.post("/api/v1/auth/google", json={"id_token": "token_1"})
        assert res1.status_code == 200
        user_id_1 = res1.json()["user"]["id"]
        session_id_1 = res1.json()["session_id"]

        # 2. Second login
        res2 = client.post("/api/v1/auth/google", json={"id_token": "token_2"})
        assert res2.status_code == 200
        user_id_2 = res2.json()["user"]["id"]
        session_id_2 = res2.json()["session_id"]

        # Must resolve to the exact same user ID
        assert user_id_1 == user_id_2

        # Must create a separate active session
        assert session_id_1 != session_id_2

        # Exactly ONE identity record must exist
        ident_count = db_session.query(AuthIdentity).filter(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_subject_id == google_sub
        ).count()
        assert ident_count == 1

def test_google_oauth_safe_account_linking_existing_password_user(client, db_session: Session):
    """Existing email/password user can safely link their verified Google identity."""
    shared_email = f"shared_{uuid.uuid4().hex[:8]}@business.com"
    password = "InitialSecurePassword123!"

    # 1. Register with email/password
    reg_res = client.post("/api/v1/auth/register", json={
        "email": shared_email,
        "password": password,
        "full_name": "Original Password User"
    })
    assert reg_res.status_code == 201
    original_user_id = reg_res.json()["user"]["id"]

    # 2. Sign in via Google with the same verified email
    google_sub = f"goog_sub_{uuid.uuid4().hex[:12]}"
    mock_id_info = {
        "iss": "accounts.google.com",
        "sub": google_sub,
        "email": shared_email,
        "email_verified": True,
        "name": "Original Password User"
    }

    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        google_res = client.post("/api/v1/auth/google", json={"id_token": "valid_token"})
        assert google_res.status_code == 200
        linked_user_id = google_res.json()["user"]["id"]
        assert linked_user_id == original_user_id

        # Check identity is linked to original user
        ident = db_session.query(AuthIdentity).filter(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_subject_id == google_sub
        ).first()
        assert ident is not None
        assert ident.user_id == original_user_id

        # 3. Password login still works for the original account!
        pwd_res = client.post("/api/v1/auth/login", json={
            "email": shared_email,
            "password": password
        })
        assert pwd_res.status_code == 200
        assert pwd_res.json()["user"]["id"] == original_user_id

def test_google_oauth_inactive_returning_user_rejected_403(client, db_session: Session):
    """Deactivated Google account cannot log in and returns 403 Forbidden."""
    google_sub = f"goog_sub_{uuid.uuid4().hex[:12]}"
    google_email = f"deactivated_{uuid.uuid4().hex[:8]}@gmail.com"

    mock_id_info = {
        "iss": "accounts.google.com",
        "sub": google_sub,
        "email": google_email,
        "email_verified": True,
        "name": "Deactivated User"
    }

    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        # 1. Initial sign-in
        res = client.post("/api/v1/auth/google", json={"id_token": "token_1"})
        assert res.status_code == 200
        user_id = res.json()["user"]["id"]

        # 2. Deactivate the account directly in database
        db_user = db_session.query(User).filter(User.id == user_id).first()
        db_user.is_active = False
        db_session.commit()

        # 3. Subsequent Google login rejected
        res2 = client.post("/api/v1/auth/google", json={"id_token": "token_2"})
        assert res2.status_code == 403
        assert "deactivated" in res2.json()["detail"].lower()

def test_google_oauth_inactive_existing_email_user_rejected_403_no_linking(client, db_session: Session):
    """If an existing account with matching email is deactivated, Google login is rejected without linking."""
    shared_email = f"inactive_match_{uuid.uuid4().hex[:8]}@example.com"
    
    # Create deactivated user directly
    user = User(
        email=shared_email,
        full_name="Inactive Person",
        hashed_password="dummy_password_hash",
        is_active=False
    )
    db_session.add(user)
    db_session.commit()

    google_sub = f"goog_sub_{uuid.uuid4().hex[:12]}"
    mock_id_info = {
        "iss": "accounts.google.com",
        "sub": google_sub,
        "email": shared_email,
        "email_verified": True,
        "name": "Inactive Person"
    }

    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        res = client.post("/api/v1/auth/google", json={"id_token": "any_token"})
        assert res.status_code == 403
        assert "deactivated" in res.json()["detail"].lower()

        # Confirm identity was NOT linked
        ident = db_session.query(AuthIdentity).filter(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_subject_id == google_sub
        ).first()
        assert ident is None

def test_google_oauth_has_merchant_flag_reflects_memberships(client, db_session: Session):
    """UserResponse.has_merchant accurately reflects whether the user has a merchant profile."""
    google_sub = f"goog_sub_{uuid.uuid4().hex[:12]}"
    google_email = f"merchant_owner_{uuid.uuid4().hex[:8]}@gmail.com"

    mock_id_info = {
        "iss": "accounts.google.com",
        "sub": google_sub,
        "email": google_email,
        "email_verified": True,
        "name": "Store Owner"
    }

    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        # 1. First login -> has_merchant is False
        res1 = client.post("/api/v1/auth/google", json={"id_token": "token_1"})
        assert res1.status_code == 200
        assert res1.json()["user"]["has_merchant"] is False
        user_id = res1.json()["user"]["id"]

        # 2. Add merchant workspace for this user
        merchant = MerchantProfile(
            id=str(uuid.uuid4()),
            business_name="Alex Electronics Store",
            currency="USD"
        )
        db_session.add(merchant)
        db_session.flush()

        member = MerchantMember(
            merchant_id=merchant.id,
            user_id=user_id,
            role="OWNER"
        )
        db_session.add(member)
        db_session.commit()

        # 3. Next login -> has_merchant is True
        res2 = client.post("/api/v1/auth/google", json={"id_token": "token_2"})
        assert res2.status_code == 200
        assert res2.json()["user"]["has_merchant"] is True
