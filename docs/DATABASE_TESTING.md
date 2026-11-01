# DATABASE_TESTING.md
## Automated Database Testing Strategy & Verification Report
### PayPal Merchant Growth Engine

---

## 1. Testing Philosophy & Isolation

All database testing follows strict isolation standards:
- **Unit & Logic Tests**: Use isolated SQLite in-memory databases with automatic table teardown per test function (`backend/tests/conftest.py`).
- **PostgreSQL Integration Tests**: Connect directly to the local PostgreSQL 18 instance (`backend/tests/test_database_postgres.py`) using transactional boundaries with explicit rollbacks to leave the live database state completely unpolluted.
- **End-to-End Persistence Tests**: Verify that records persist across multiple API requests and application restarts without data loss.

---

## 2. Test Suites

### 2.1 Database Integration Tests (`backend/tests/test_database_postgres.py`)
- `test_postgres_connection_and_version`: Validates native connection to PostgreSQL 18.4 on `localhost:5432`.
- `test_all_tables_exist_in_postgres`: Asserts that all 32 application tables exist in the `public` schema following Alembic migrations.
- `test_postgres_foreign_key_enforcement`: Asserts that inserting records with invalid foreign keys raises an `IntegrityError`.
- `test_postgres_unique_constraints`: Asserts that duplicate SKUs within the same merchant scope are rejected by the unique constraint `uq_merchant_product_sku`.
- `test_postgres_transaction_rollback`: Asserts that rolled-back transactions leave zero residual records.

### 2.2 Multi-Tenancy & Authorization Tests (`backend/tests/test_multi_tenancy.py`)
- Asserts that Merchant A cannot query, update, or delete products or transactions belonging to Merchant B.
- Asserts that `X-Merchant-ID` header tampering without valid user membership results in `403 FORBIDDEN`.

### 2.3 Product & Sales Persistence Tests (`backend/tests/test_products_sales.py`)
- Tests product creation, SKU uniqueness, and stock ledger tracking (`inventory_movements`).
- Tests manual sales logging, stock decrements, and CSV imports.

### 2.4 ML Pipeline & Graceful Degradation Tests (`backend/tests/test_ml_pipelines.py`)
- Asserts that Holt-Winters returns `INSUFFICIENT_DATA` when fewer than 5 daily sales points exist.
- Asserts that K-Means RFM clustering returns `INSUFFICIENT_DATA` when fewer than 4 customer records exist.
- Validates model execution once empirical thresholds are satisfied.

---

## 3. How to Run the Tests

```powershell
# Run the complete test suite
python -m pytest backend/tests/ -v

# Run PostgreSQL-specific database tests
python -m pytest backend/tests/test_database_postgres.py -v

# Run End-to-End Platform Verification Script
python scripts/verify_platform.py
```
