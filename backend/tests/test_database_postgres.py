import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from backend.app.core.config import settings
from backend.app.models.user import User, MerchantProfile, MerchantMember
from backend.app.models.inventory import Product, InventoryMovement, DailySale
from backend.app.models.transaction import Transaction, Customer, Order

@pytest.fixture(scope="module")
def pg_session():
    """Connects to the local PostgreSQL database and yields a session within an isolated transaction."""
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        engine.dispose()

def test_postgres_connection_and_version(pg_session):
    result = pg_session.execute(text("SELECT version();")).scalar()
    assert "PostgreSQL" in result

def test_all_tables_exist_in_postgres(pg_session):
    tables = pg_session.execute(text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    """)).scalars().all()
    
    expected_tables = {
        "users", "merchant_profiles", "merchant_members", "merchant_settings",
        "auth_identities", "user_sessions", "password_reset_tokens", "email_verification_tokens",
        "authentication_events", "products", "inventory_movements", "daily_sales",
        "purchase_order_drafts", "reorder_recommendations", "customers", "orders",
        "order_items", "transactions", "paypal_connections", "webhook_events",
        "paypal_sync_jobs", "customer_segments", "customer_segment_assignments",
        "demand_forecasts", "ml_models", "ml_training_runs", "marketing_campaigns",
        "agent_conversations", "agent_messages", "agent_tool_executions", "audit_logs",
        "alembic_version"
    }
    
    for t in expected_tables:
        assert t in tables, f"Expected table '{t}' was not found in PostgreSQL schema"

def test_postgres_foreign_key_enforcement(pg_session):
    # Attempt to insert product with non-existent merchant_id
    invalid_product = Product(
        id=str(uuid.uuid4()),
        merchant_id="non-existent-merchant-id",
        sku="TEST-FAIL-FK",
        name="Invalid FK Product",
        category="General",
        unit_cost=Decimal("10.00"),
        selling_price=Decimal("20.00"),
        current_stock=5
    )
    pg_session.add(invalid_product)
    with pytest.raises(IntegrityError):
        pg_session.flush()
    pg_session.rollback()

def test_postgres_unique_constraints(pg_session):
    # Create merchant
    merchant = MerchantProfile(
        id=str(uuid.uuid4()),
        business_name="Unique Constraint Test Merchant",
        currency="USD"
    )
    pg_session.add(merchant)
    pg_session.flush()

    p1 = Product(
        id=str(uuid.uuid4()),
        merchant_id=merchant.id,
        sku="DUP-SKU-TEST",
        name="Product 1",
        unit_cost=Decimal("5.00"),
        selling_price=Decimal("15.00")
    )
    pg_session.add(p1)
    pg_session.flush()

    # Attempt to insert duplicate SKU for the same merchant
    p2 = Product(
        id=str(uuid.uuid4()),
        merchant_id=merchant.id,
        sku="DUP-SKU-TEST",
        name="Product 2 Duplicate",
        unit_cost=Decimal("5.00"),
        selling_price=Decimal("15.00")
    )
    pg_session.add(p2)
    with pytest.raises(IntegrityError):
        pg_session.flush()
    pg_session.rollback()

def test_postgres_transaction_rollback(pg_session):
    # Verify that rolled back records leave no trace
    test_email = f"rollback_{uuid.uuid4()}@test.com"
    user = User(
        id=str(uuid.uuid4()),
        email=test_email,
        hashed_password="hashed_pass_test",
        full_name="Rollback Tester"
    )
    pg_session.add(user)
    pg_session.flush()

    # Confirm visible within transaction
    found = pg_session.query(User).filter(User.email == test_email).first()
    assert found is not None

    # Roll back
    pg_session.rollback()

    # Confirm gone after rollback
    found_after = pg_session.query(User).filter(User.email == test_email).first()
    assert found_after is None
