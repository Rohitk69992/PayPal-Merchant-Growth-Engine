import pytest
import uuid
from decimal import Decimal
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
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
from backend.app.models.inventory import Product

TEST_CLIENT_ID = "test-postgres-google-client.apps.googleusercontent.com"
client = TestClient(app)

@pytest.fixture(scope="module")
def pg_session():
    """Connects to local PostgreSQL directly."""
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        engine.dispose()

def test_postgres_google_oauth_first_login_and_returning_user_lifecycle(pg_session):
    """
    Directly tests PostgreSQL persistence lifecycle:
    1. First Google sign-in: creates 1 user, 1 identity, 1 session in PostgreSQL.
    2. Inspect PostgreSQL directly to confirm no duplicates.
    3. Logout: revokes session in PostgreSQL.
    4. Second Google sign-in: reuses the exact same user ID and identity; creates new session.
    """
    google_sub = f"pg_sub_{uuid.uuid4().hex[:12]}"
    google_email = f"pg_user_{uuid.uuid4().hex[:8]}@gmail.com"
    user_name = "PostgreSQL Lifecycle Tester"

    mock_id_info = {
        "iss": "https://accounts.google.com",
        "sub": google_sub,
        "email": google_email,
        "email_verified": True,
        "name": user_name
    }

    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        # --- PHASE 1: FIRST LOGIN ---
        login_res_1 = client.post("/api/v1/auth/google", json={"id_token": "mock_first_token"})
        assert login_res_1.status_code == 200, login_res_1.text
        data_1 = login_res_1.json()
        token_1 = data_1["access_token"]
        user_id_1 = data_1["user"]["id"]
        session_id_1 = data_1["session_id"]

        # DIRECT POSTGRESQL INSPECTION
        # 1. Exactly 1 user in PostgreSQL
        users = pg_session.query(User).filter(User.email == google_email).all()
        assert len(users) == 1
        assert users[0].id == user_id_1
        assert users[0].full_name == user_name
        assert users[0].is_active is True
        assert users[0].is_verified is True

        # 2. Exactly 1 Google identity in PostgreSQL
        identities = pg_session.query(AuthIdentity).filter(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_subject_id == google_sub
        ).all()
        assert len(identities) == 1
        assert identities[0].user_id == user_id_1
        assert identities[0].email == google_email

        # 3. Active session exists in PostgreSQL
        sess_1 = pg_session.query(UserSession).filter(UserSession.id == session_id_1).first()
        assert sess_1 is not None
        assert sess_1.user_id == user_id_1
        assert sess_1.is_revoked is False

        # 4. Audit event logged in PostgreSQL
        audit_1 = pg_session.query(AuthenticationEvent).filter(
            AuthenticationEvent.user_id == user_id_1,
            AuthenticationEvent.event_type == "GOOGLE_LOGIN_SUCCESS"
        ).first()
        assert audit_1 is not None

        # --- PHASE 2: ATTACH MERCHANT & PRODUCTS ---
        merchant = MerchantProfile(
            id=str(uuid.uuid4()),
            business_name="Postgres Merchant Enterprise",
            currency="USD"
        )
        pg_session.add(merchant)
        pg_session.flush()

        member = MerchantMember(
            merchant_id=merchant.id,
            user_id=user_id_1,
            role="OWNER"
        )
        pg_session.add(member)

        product = Product(
            id=str(uuid.uuid4()),
            merchant_id=merchant.id,
            sku=f"SKU-{uuid.uuid4().hex[:6]}",
            name="Enterprise Cloud Server",
            category="Hardware",
            unit_cost=Decimal("250.00"),
            selling_price=Decimal("499.00"),
            current_stock=15
        )
        pg_session.add(product)
        pg_session.commit()

        # --- PHASE 3: LOGOUT ---
        logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token_1}"})
        assert logout_res.status_code == 200

        # Session revoked in PostgreSQL
        pg_session.expire_all()
        sess_1_after = pg_session.query(UserSession).filter(UserSession.id == session_id_1).first()
        assert sess_1_after.is_revoked is True

        # User and merchant data still intact in PostgreSQL
        assert pg_session.query(User).filter(User.id == user_id_1).first() is not None
        assert pg_session.query(Product).filter(Product.id == product.id).first() is not None

        # --- PHASE 4: SECOND LOGIN (RETURNING USER) ---
        login_res_2 = client.post("/api/v1/auth/google", json={"id_token": "mock_second_token"})
        assert login_res_2.status_code == 200
        data_2 = login_res_2.json()
        user_id_2 = data_2["user"]["id"]
        session_id_2 = data_2["session_id"]

        # MUST resolve to identical user ID
        assert user_id_2 == user_id_1
        assert session_id_2 != session_id_1
        assert data_2["user"]["has_merchant"] is True

        # Check PostgreSQL: Still exactly 1 user and 1 identity!
        pg_session.expire_all()
        assert pg_session.query(User).filter(User.email == google_email).count() == 1
        assert pg_session.query(AuthIdentity).filter(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_subject_id == google_sub
        ).count() == 1

        # Check PostgreSQL: Exactly 2 sessions exist
        total_sessions = pg_session.query(UserSession).filter(UserSession.user_id == user_id_1).count()
        assert total_sessions == 2

        # Check PostgreSQL: Merchant and Product are still intact!
        persisted_product = pg_session.query(Product).filter(Product.id == product.id).first()
        assert persisted_product is not None
        assert persisted_product.name == "Enterprise Cloud Server"

def test_postgres_unique_constraint_uq_provider_subject_id(pg_session):
    """PostgreSQL database engine strictly enforces uq_provider_subject_id uniqueness."""
    user1 = User(
        email=f"user1_{uuid.uuid4().hex[:8]}@example.com",
        full_name="User One",
        hashed_password="hash_password_123"
    )
    user2 = User(
        email=f"user2_{uuid.uuid4().hex[:8]}@example.com",
        full_name="User Two",
        hashed_password="hash_password_456"
    )
    pg_session.add_all([user1, user2])
    pg_session.flush()

    fixed_sub = f"fixed_sub_{uuid.uuid4().hex[:12]}"
    
    # First identity
    ident1 = AuthIdentity(
        user_id=user1.id,
        provider="google",
        provider_subject_id=fixed_sub,
        email=user1.email
    )
    pg_session.add(ident1)
    pg_session.flush()

    # Attempt second identity with identical provider and subject_id
    ident2 = AuthIdentity(
        user_id=user2.id,
        provider="google",
        provider_subject_id=fixed_sub,
        email=user2.email
    )
    pg_session.add(ident2)

    with pytest.raises(IntegrityError):
        pg_session.flush()

    pg_session.rollback()

def test_postgres_safe_account_linking_with_existing_merchant_data(pg_session):
    """
    When an existing email/password account signs in with Google:
    1. Identity is safely linked to the existing user.
    2. Existing merchant memberships and business data in PostgreSQL are preserved untouched.
    """
    shared_email = f"linked_{uuid.uuid4().hex[:8]}@company.com"
    pwd = "SecureExistingPassword2026!"

    # 1. Register via regular registration
    reg_res = client.post("/api/v1/auth/register", json={
        "email": shared_email,
        "password": pwd,
        "full_name": "Merchant CEO"
    })
    assert reg_res.status_code == 201
    user_id = reg_res.json()["user"]["id"]

    # 2. Associate a merchant profile and products in PostgreSQL
    merchant = MerchantProfile(
        id=str(uuid.uuid4()),
        business_name="CEO Retail Enterprise",
        currency="USD"
    )
    pg_session.add(merchant)
    pg_session.flush()

    member = MerchantMember(
        merchant_id=merchant.id,
        user_id=user_id,
        role="OWNER"
    )
    pg_session.add(member)

    prod = Product(
        id=str(uuid.uuid4()),
        merchant_id=merchant.id,
        sku=f"PROD-{uuid.uuid4().hex[:6]}",
        name="Flagship Audio Monitor",
        category="Electronics",
        unit_cost=Decimal("120.00"),
        selling_price=Decimal("299.99"),
        current_stock=40
    )
    pg_session.add(prod)
    pg_session.commit()

    # 3. Sign in via Google with the same email
    google_sub = f"ceo_sub_{uuid.uuid4().hex[:12]}"
    mock_id_info = {
        "iss": "accounts.google.com",
        "sub": google_sub,
        "email": shared_email,
        "email_verified": True,
        "name": "Merchant CEO"
    }

    with patch("backend.app.api.v1.auth.settings.GOOGLE_CLIENT_ID", TEST_CLIENT_ID), \
         patch("backend.app.api.v1.auth.verify_google_id_token", return_value=mock_id_info):
        
        google_res = client.post("/api/v1/auth/google", json={"id_token": "mock_google_token"})
        assert google_res.status_code == 200
        data = google_res.json()
        assert data["user"]["id"] == user_id
        assert data["user"]["has_merchant"] is True

        # Verify PostgreSQL database state directly
        pg_session.expire_all()
        # Identity created and linked
        ident = pg_session.query(AuthIdentity).filter(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_subject_id == google_sub
        ).first()
        assert ident is not None
        assert ident.user_id == user_id

        # Merchant membership preserved
        members = pg_session.query(MerchantMember).filter(MerchantMember.user_id == user_id).all()
        assert len(members) == 1
        assert members[0].merchant_id == merchant.id

        # Product preserved
        persisted_prod = pg_session.query(Product).filter(Product.id == prod.id).first()
        assert persisted_prod is not None
        assert persisted_prod.selling_price == Decimal("299.99")
