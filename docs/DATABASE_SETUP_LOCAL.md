# DATABASE_SETUP_LOCAL.md
## Local-First PostgreSQL Setup & Administration Guide
### PayPal Merchant Growth Engine — Engineering Manual

---

## 1. Overview & Local-First Philosophy

The **PayPal Merchant Growth Engine** runs against a local-first PostgreSQL database instance. This guarantees complete inspection capability on the developer workstation before deploying to cloud-managed PostgreSQL environments (such as AWS RDS, Neon, or Supabase) with zero application code changes—only a connection string change in environment variables.

---

## 2. PostgreSQL Configuration & Service Verification

### 2.1 Service Information
- **RDBMS Engine**: PostgreSQL 18.4 (x86_64, Windows)
- **Port**: `5432`
- **Host**: `localhost` (127.0.0.1 / ::1)
- **Windows Service Name**: `postgresql-x64-18`

To verify that the service is running:
```powershell
Get-Service -Name "postgresql-x64-18"
Get-NetTCPConnection -LocalPort 5432
```

---

## 3. Dedicated Application Database & User Creation

The application connects using a dedicated, principle-of-least-privilege user account rather than the superuser.

### 3.1 Credentials & Database Parameters
- **Database Name**: `paypal_growth_engine`
- **Application User**: `paypal_app`
- **Application Password**: `PaypalApp2026Secure!`
- **Authentication Method**: `scram-sha-256`

### 3.2 SQL Setup Commands (Executed by Administrator)
```sql
-- Connect as postgres superuser
-- psql -U postgres -h localhost -p 5432 -d postgres

CREATE DATABASE paypal_growth_engine;

CREATE USER paypal_app WITH PASSWORD 'PaypalApp2026Secure!';

GRANT ALL PRIVILEGES ON DATABASE paypal_growth_engine TO paypal_app;
\c paypal_growth_engine
GRANT ALL ON SCHEMA public TO paypal_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO paypal_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO paypal_app;
```

---

## 4. SQLAlchemy 2.x Connection String

The application references the database via the `DATABASE_URL` environment variable:

```bash
DATABASE_URL=postgresql://paypal_app:PaypalApp2026Secure!@localhost:5432/paypal_growth_engine
```

### 4.1 Production Connection Pool Configuration
In `backend/app/core/database.py`, the engine is configured with robust pooling:
- `pool_size = 10`
- `max_overflow = 20`
- `pool_timeout = 30` (seconds)
- `pool_recycle = 1800` (recycle connections after 30 minutes to prevent stale handle timeouts)
- `pool_pre_ping = True` (validates connection liveness before checking out from pool)

---

## 5. Migration Execution with Alembic

All 32 tables are created and managed via Alembic migrations.

### 5.1 Inspect Current Migration Version
```powershell
alembic current
```
Expected output:
```text
edbbe21f9457 (head)
```

### 5.2 Apply Latest Migrations
```powershell
alembic upgrade head
```

### 5.3 Revert Migrations (Controlled Rollback)
```powershell
# Rollback one migration step
alembic downgrade -1

# Rollback to baseline empty state
alembic downgrade base
```

---

## 6. Inspecting Database Records via CLI (`psql`)

To directly inspect database tables, schemas, and live records:

```powershell
# Set temporary environment password
$env:PGPASSWORD = "PaypalApp2026Secure!"

# Connect to the application database
psql -U paypal_app -h localhost -p 5432 -d paypal_growth_engine

# Useful psql commands:
# \dt                 -- List all application tables
# \d users            -- Inspect users schema and constraints
# \d transactions     -- Inspect transactions financial ledger schema
# SELECT id, email, full_name, is_active FROM users;
# SELECT id, business_name, currency FROM merchant_profiles;
# SELECT id, sku, name, current_stock, selling_price FROM products;
# SELECT id, gross_amount, fee_amount, net_amount, status FROM transactions;
```

---

## 7. Database Backup & Restore Procedures

### 7.1 Creating a Logical Backup
To export the complete schema and all user-generated data:
```powershell
$env:PGPASSWORD = "PaypalApp2026Secure!"
pg_dump -U paypal_app -h localhost -p 5432 -F c -b -v -f "backup_paypal_growth_engine_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump" paypal_growth_engine
```

### 7.2 Restoring from Backup
```powershell
$env:PGPASSWORD = "Rohitk69@123"
# Drop existing test database if clean rebuild required
dropdb -U postgres -h localhost -p 5432 --if-exists paypal_growth_engine_restore_test
createdb -U postgres -h localhost -p 5432 paypal_growth_engine_restore_test

$env:PGPASSWORD = "PaypalApp2026Secure!"
pg_restore -U paypal_app -h localhost -p 5432 -d paypal_growth_engine_restore_test -v "backup_file.dump"
```
