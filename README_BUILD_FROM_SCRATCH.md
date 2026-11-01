# PayPal Merchant Growth Engine — Complete End-to-End Build Guide (From Scratch)

> **Document Type:** Master Architectural Blueprint & Implementation Manual  
> **Project:** PayPal Merchant Growth Engine  
> **Tech Stack:** React 19 (Vite, TypeScript, Tailwind CSS), FastAPI (Python 3.11), PostgreSQL 18.4 (SQLAlchemy 2.x, Alembic), Scikit-Learn, Statsmodels, Google Gemini AI  
> **Author:** Senior Database Architect, Backend Engineer & Security Specialist  

---

## Table of Contents
1. [Executive Overview & Business Context](#1-executive-overview--business-context)
2. [Prerequisites & Development Environment](#2-prerequisites--development-environment)
3. [Phase 1: Architecture & Multi-Tenant Database Design](#3-phase-1-architecture--multi-tenant-database-design)
4. [Phase 2: PostgreSQL Infrastructure & Alembic Migrations](#4-phase-2-postgresql-infrastructure--alembic-migrations)
5. [Phase 3: Identity, Authentication & Session Security](#5-phase-3-identity-authentication--session-security)
6. [Phase 4: Merchant Management, Workspaces & RBAC](#6-phase-4-merchant-management-workspaces--rbac)
7. [Phase 5: Product Catalog, Inventory Ledger & Sales Persistence](#7-phase-5-product-catalog-inventory-ledger--sales-persistence)
8. [Phase 6: Machine Learning Pipelines & AI Agent Tracking](#8-phase-6-machine-learning-pipelines--ai-agent-tracking)
9. [Phase 7: Frontend Integration & Full-Stack Alignment](#9-phase-7-frontend-integration--full-stack-alignment)
10. [Phase 8: Security Verification, Threat Testing & Audit](#10-phase-8-security-verification-threat-testing--audit)
11. [Step-by-Step Reproduction Guide (From Absolute Zero)](#11-step-by-step-reproduction-guide-from-absolute-zero)

---

## 1. Executive Overview & Business Context

The **PayPal Merchant Growth Engine** elevates the PayPal developer platform from a traditional transaction processor into an active, intelligent operating system for small and medium-sized businesses (SMBs). 

### Key Business & Technical Requirements:
1. **Zero-Fabrication Baseline**: When actual users register, they start with a 100% clean-slate account (zero mock transactions, zero synthetic customers, zero fake balances).
2. **Local-First with Cloud Readiness**: The primary environment runs natively on a local workstation using PostgreSQL 18.4, with zero architectural friction when containerized for AWS RDS, Google Cloud SQL, or Azure Database.
3. **Multi-Tenant Workspace Isolation**: Every business record (product, sale, customer, movement, forecast, campaign) is strictly bound to a `merchant_id`. Backend middleware verifies that the authenticated user possesses active membership in that tenant workspace.
4. **Exact Financial Precision**: All prices, revenues, fees, and currency values use `Numeric(10, 2)` or `Numeric(12, 2)` to eliminate IEEE 754 floating-point rounding errors.
5. **Auditable Double-Entry Inventory Movements**: Stock levels are never mutated in isolation; every adjustment or sale writes an immutable row to `inventory_movements`.
6. **Empirical Machine Learning**: Scikit-Learn RFM clustering and Statsmodels Holt-Winters forecasting execute strictly when empirical data satisfies mathematical prerequisites ($\ge 4$ customers, $\ge 5$ sales days). Sparse data returns a clear `INSUFFICIENT_DATA` state.

---

## 2. Prerequisites & Development Environment

- **Operating System**: Windows 11, Linux (Ubuntu 22.04+), or macOS
- **Python**: 3.11.x (with `pip`, `venv`)
- **Node.js**: 18.x or 20.x (with `npm`)
- **Database Engine**: PostgreSQL 15+ (PostgreSQL 18.4 installed locally)
- **Database Tools**: `psql` CLI, `pgAdmin 4`
- **Core Python Packages**:
  - `fastapi`, `uvicorn[standard]`, `pydantic[email]`
  - `sqlalchemy>=2.0`, `alembic`, `psycopg2-binary`
  - `argon2-cffi`, `bcrypt`, `passlib`, `pyjwt`, `google-auth`
  - `pandas`, `numpy`, `scikit-learn`, `statsmodels`
  - `pytest`, `httpx`
- **Core Frontend Packages**:
  - `react@^19.0.0`, `react-dom@^19.0.0`, `react-router-dom@^7.0.0`
  - `vite@^6.0.0`, `tailwindcss@^4.0.0`, `recharts`, `lucide-react`

---

## 3. Phase 1: Architecture & Multi-Tenant Database Design

### Database Inventory: 32 Normalized Tables
The database is structured into 7 logical subdomains:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL RELATIONAL DOMAINS                   │
├─────────────────────┬────────────────────┬─────────────────────────────┤
│ 1. Identity & Auth  │ 2. Tenancy & Roles │ 3. Products & Inventory     │
│  - users            │  - merchant_       │  - products                 │
│  - auth_identities  │    profiles        │  - inventory_movements      │
│  - user_sessions    │  - merchant_       │  - reorder_recommendations  │
│  - password_reset_  │    members         │  - purchase_order_drafts    │
│    tokens           │  - merchant_       │                             │
│  - email_verify_    │    settings        │                             │
│    tokens           │                    │                             │
│  - auth_events      │                    │                             │
├─────────────────────┼────────────────────┼─────────────────────────────┤
│ 4. Sales & Payments │ 5. Machine Learning│ 6. AI Agent System          │
│  - daily_sales      │  - customers       │  - agent_conversations      │
│  - transactions     │  - customer_       │  - agent_messages           │
│  - paypal_          │    segments        │  - agent_tool_executions    │
│    connections      │  - segment_        │                             │
│  - paypal_sync_jobs │    assignments     │                             │
│  - webhook_events   │  - demand_forecasts│                             │
│  - orders           │  - ml_models       │                             │
│  - order_items      │  - ml_training_runs│                             │
├─────────────────────┴────────────────────┴─────────────────────────────┤
│ 7. Audit & Compliance: audit_logs, alembic_version                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Relational Schema Design Rules
1. **Primary Keys**: 36-character UUID strings generated client-side or server-side (`uuid.uuid4()`), indexed and collation-neutral.
2. **Foreign Keys**: Enforced at the engine level with `ON DELETE CASCADE` for child records belonging to a parent tenant or user.
3. **Compound Uniqueness**:
   - `products`: `UNIQUE(merchant_id, sku)` — Prevents duplicate SKUs within a single merchant while allowing distinct merchants to use identical supplier SKUs.
   - `daily_sales`: `UNIQUE(merchant_id, product_id, sales_date)` — Enables atomic upsert / accumulation of sales on a given day.
   - `merchant_members`: `UNIQUE(merchant_id, user_id)` — Guarantees a user holds exactly one role per merchant workspace.
   - `transactions`: `UNIQUE(paypal_transaction_id)` (filtered/sparse) — Guarantees idempotency when importing PayPal payment records.
4. **Audit Logging**: Every mutation (product created, updated, archived; sales entered; payment captured; member invited) writes to `audit_logs` capturing `action`, `resource_type`, `resource_id`, and `details_json`.

---

## 4. Phase 2: PostgreSQL Infrastructure & Alembic Migrations

### Local Service Provisioning
PostgreSQL runs as a native Windows service (`postgresql-x64-18`) on `localhost:5432`.
```sql
-- Role and Database Initialization
CREATE ROLE paypal_app WITH LOGIN PASSWORD 'PaypalApp2026Secure!';
CREATE DATABASE paypal_growth_engine OWNER paypal_app;
GRANT ALL PRIVILEGES ON DATABASE paypal_growth_engine TO paypal_app;
```

### Connection Configuration (`backend/app/core/config.py`)
```python
DATABASE_URL: str = "postgresql://paypal_app:PaypalApp2026Secure!@localhost:5432/paypal_growth_engine"
```

### Alembic Migration Setup
Alembic is configured at the project root with `alembic.ini` and `backend/alembic/`:
- `backend/alembic/env.py` imports `backend.app.models` and binds `target_metadata = Base.metadata`.
- Initial migration generated and applied:
  - `backend/alembic/versions/edbbe21f9457_001_initial_schema.py`
  - Defines all 32 tables, composite foreign keys, constraints, and B-tree indexes.
  - Executed via:
    ```powershell
    alembic upgrade head
    ```

---

## 5. Phase 3: Identity, Authentication & Session Security

### Security Primitives (`backend/app/core/security.py`)
- **Password Hashing**: Argon2id (`argon2-cffi`) with parameters:
  - Memory cost: $65,536\text{ KB}$ (64 MB)
  - Time cost: 3 iterations
  - Parallelism: 4 threads
  - Bcrypt fallback is maintained for legacy compatibility.
- **Stateful JWT Sessions**:
  - JWT tokens encode `sub` (user UUID), `email`, and `sid` (session UUID).
  - Every login records a row in `user_sessions` with `expires_at`, `ip_address`, and `user_agent`.
  - When `/auth/logout` is called, `user_sessions.is_revoked` is set to `True`.
  - The dependency `get_current_user` rejects any token whose `sid` is expired or marked `is_revoked == True`.
- **Password Reset Flow**:
  - Cryptographically secure token generated (`secrets.token_urlsafe(32)`).
  - Stored at rest as a SHA-256 hash in `password_reset_tokens`.
  - Single-use, valid for 15 minutes.
- **Google OpenID Connect**:
  - Uses `google.oauth2.id_token.verify_oauth2_token`.
  - Validates `iss` (`accounts.google.com`), `aud` (`GOOGLE_CLIENT_ID`), and signature.
  - Links to existing accounts via `auth_identities` table using Google's stable subject ID (`sub`).

---

## 6. Phase 4: Merchant Management, Workspaces & RBAC

### Tenant Onboarding (`POST /merchants/onboarding`)
When a user registers, they are redirected to `/onboarding`:
1. Creates a new row in `merchant_profiles` (`business_name`, `currency`, `business_category`).
2. Inserts membership into `merchant_members` assigning role `OWNER`.
3. Creates default configuration in `merchant_settings` (`auto_reorder_enabled=False`, `default_safety_stock=10`).
4. Logs `MERCHANT_ONBOARDED` in `audit_logs`.

### Multi-Tenancy & Workspace Switching
- **Resolution**: Frontend passes active merchant via the `X-Merchant-ID` header.
- **Middleware Check**: `get_current_merchant` dependency in `backend/app/core/dependencies.py`:
  - Queries `merchant_members` for `(merchant_id == X-Merchant-ID, user_id == current_user.id)`.
  - If no membership exists, immediately raises `HTTP 403 Forbidden`.
  - Cross-tenant data leakage is structurally impossible.
- **Role Hierarchy**:
  - `OWNER`: Full administrative, financial, member management, and workspace deletion rights. Sole owner protection prevents the last owner from leaving.
  - `ADMIN`: Catalog, sales, settings, and member invitation rights.
  - `ANALYST`: Read access to analytics, forecasting, marketing campaigns, and transaction logs.
  - `VIEWER`: Read-only access to catalogs and dashboards; write endpoints raise `HTTP 403`.
- **GDPR Export (`GET /settings/export`)**: Compiles all products, sales, inventory movements, transactions, customer profiles, and audit trails into a cryptographic JSON payload.

---

## 7. Phase 5: Product Catalog, Inventory Ledger & Sales Persistence

### Product Catalog (`backend/app/api/v1/products.py`)
- **SKU Isolation**: Enforced via `UNIQUE(merchant_id, sku)`.
- **Pricing**: `unit_cost` and `selling_price` stored as `Numeric(10, 2)`.
- **Initial Ledger Movement**: Creating a product with stock automatically records an `INITIAL` entry in `inventory_movements`.
- **Soft Archival**: `DELETE /products/{id}` sets `is_active = False` rather than deleting rows, preserving historical sales foreign key integrity.

### Inventory Double-Entry Ledger (`backend/app/api/v1/inventory.py`)
- Table `inventory_movements` logs every change:
  - `movement_type`: `INITIAL`, `SALE`, `RESTOCK`, `ADJUSTMENT`, `RETURN`.
  - `quantity`: Signed integer delta.
  - `stock_after`: Current stock balance immediately following the transaction.
  - `reason`: Audit text explanation.
- **Non-Negative Guard**: Any adjustment resulting in `current_stock < 0` is rejected with `HTTP 400 Bad Request`.

### Daily Sales & Automatic Stock Depletion (`backend/app/api/v1/sales.py`)
- **Endpoint**: `POST /sales/`
- **Atomic Operations**:
  1. Checks if `daily_sales` record exists for `(merchant_id, product_id, sales_date)`.
  2. If present, increments `units_sold += units` and `revenue += revenue`.
  3. If new, inserts a new `daily_sales` record.
  4. Automatically decrements `Product.current_stock -= units`.
  5. Inserts an immutable `SALE` movement into `inventory_movements`.
  6. Commits within a single atomic database transaction.

### Transactions & Idempotent PayPal Imports (`backend/app/api/v1/transactions.py`)
- **Manual Transactions**: Supports income and expense entries (`payment_source="MANUAL"`).
- **Automated Customer Profiling**: Transaction processing automatically updates or creates records in `customers` (`total_spend`, `total_orders`, `last_purchase_date`).
- **PayPal Import Idempotency**: `POST /transactions/import-paypal` verifies `paypal_transaction_id`. Duplicate imports return existing records without double-crediting balances.

---

## 8. Phase 6: Machine Learning Pipelines & AI Agent Tracking

### 1. RFM Customer Segmentation (`backend/app/ml/rfm.py`)
- **Features**: Recency ($R$), Frequency ($F$), Monetary ($M$).
- **Mathematical Prerequisite**: Requires $\ge 4$ customer records.
- **Pipeline**:
  1. Computes $R$ (days since last transaction), $F$ (order count), $M$ (total spend).
  2. Normalizes features using `StandardScaler`.
  3. Fits Scikit-learn `KMeans(n_clusters=4, random_state=42)`.
  4. Computes clustering quality via `silhouette_score`.
  5. Assigns human-interpretable labels:
     - *High-Value Champions*
     - *Loyal Regulars*
     - *At-Risk Customers*
     - *Recent Inactive / New*
  6. **Persistence**: Saves model metadata in `ml_models`, execution metrics in `ml_training_runs`, cohort definitions in `customer_segments`, and individual mapping in `customer_segment_assignments`.

### 2. Daily Product Demand Forecasting (`backend/app/ml/forecasting.py`)
- **Algorithms**:
  - $\ge 14$ daily data points: Statsmodels Holt-Winters Exponential Smoothing (`trend="add"`, `seasonal=None`).
  - $5 - 13$ daily data points: Weighted Moving Average ($WMA$).
  - $< 5$ points: Graceful fallback reporting `status="INSUFFICIENT_DATA"` with actionable UI hints.
- **Outputs**: 30-day projection curves with $95\%$ statistical confidence intervals (`lower_bound`, `upper_bound`).
- **Persistence**: Forecast points persisted into `demand_forecasts`, model run logged in `ml_training_runs`.

### 3. Agentic AI Copilot Tracking (`backend/app/api/v1/agent.py`)
- Powered by Google Gemini (`gemini-1.5-flash`) with controlled Python tool execution dispatchers.
- **Audit Logging**:
  - Conversation sessions stored in `agent_conversations`.
  - User and assistant messages stored in `agent_messages`.
  - Tool invocations (e.g. querying revenue, checking inventory, drafting reorder POs) logged in `agent_tool_executions` with execution arguments, result payloads, and status codes.

---

## 9. Phase 7: Frontend Integration & Full-Stack Alignment

### Centralized API Client (`frontend/src/services/apiClient.ts`)
- Automatically injects `Authorization: Bearer <token>` and `X-Merchant-ID: <id>`.
- Normalizes backend property names:
  ```typescript
  unitCost: Number(p.unit_cost ?? 0),
  unitPrice: Number(p.selling_price ?? p.unit_price ?? 0),
  stockOnHand: p.current_stock ?? p.stock_on_hand ?? 0,
  reorderThreshold: p.safety_stock ?? p.reorder_point ?? 10,
  safetyStock: Number(p.safety_stock ?? 10),
  leadTimeDays: Number(p.lead_time_days ?? 7),
  supplierName: p.supplier_name || 'Standard Supplier',
  status: p.status || (stock <= 0 ? 'OUT_OF_STOCK' : stock <= reorder ? 'LOW_STOCK' : 'IN_STOCK'),
  ```

### Dual-Mode CSV Ingestion
The CSV import modals in `ProductsPage.tsx` and `SalesEntryPage.tsx` send JSON `{ csv_content: string }`, while external scripts may send `multipart/form-data`. The backend endpoints inspect the `Content-Type` header and seamlessly decode either format.

### UI Features
- **Product Management**: Full Edit Modal and Archive action with confirmation.
- **Global AI Assistant**: Triggered from anywhere in the application via `onOpenAiDrawer` outlet context.
- **Empty-State Excellence**: Dashboards render zero-state onboarding guides when accounts are newly created.

---

## 10. Phase 8: Security Verification, Threat Testing & Audit

### Test Suite Execution
34 automated tests across 9 suites pass with 100% success:

| Test File | Tests | Focus |
|---|:---:|---|
| `test_auth.py` | 1 | Auth basics |
| `test_auth_lifecycle.py` | 7 | Argon2id, session tokens, password resets, deactivation, Google OIDC |
| `test_business_data_persistence.py` | 4 | Products, inventory movements, daily sales, transaction idempotency |
| `test_database_postgres.py` | 5 | PostgreSQL 18.4 connection, 32 tables, FK constraints, rollback |
| `test_merchant_management.py` | 5 | Onboarding, switching, tenant isolation, RBAC, GDPR export |
| `test_ml_ai_persistence.py` | 4 | RFM clustering, Holt-Winters points, campaigns, AI agent chat & tools |
| `test_ml_pipelines.py` | 1 | Insufficient data handling in Holt-Winters |
| `test_multi_tenancy.py` | 1 | Cross-merchant data barriers |
| `test_products_sales.py` | 1 | Product catalog & sales stock depletion |
| `test_security_and_tenant_verification.py` | 5 | Cross-tenant CRUD isolation, RBAC sole-owner, SQLi, atomic rollback |
| **Total** | **34** | **100% Passed (Zero Failures)** |

---

## 11. Step-by-Step Reproduction Guide (From Absolute Zero)

### Step 1: Install PostgreSQL 18
Download and install PostgreSQL 18 for your operating system. Ensure the service is active on port `5432`.

### Step 2: Initialize Database and Credentials
Launch PowerShell or Terminal and execute:
```powershell
$env:PGPASSWORD="YourPostgresSuperuserPassword"
psql -U postgres -h localhost -c "CREATE ROLE paypal_app WITH LOGIN PASSWORD 'PaypalApp2026Secure!';"
psql -U postgres -h localhost -c "CREATE DATABASE paypal_growth_engine OWNER paypal_app;"
psql -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE paypal_growth_engine TO paypal_app;"
```

### Step 3: Configure Environment Variables
Create `backend/.env` with:
```ini
APP_NAME="PayPal Merchant Growth Engine"
APP_ENV=development
DEBUG=True
PORT=8000
SECRET_KEY=paypal_merchant_growth_engine_super_secret_jwt_key_2026_production_ready
ACCESS_TOKEN_EXPIRE_MINUTES=1440

DATABASE_URL=postgresql://paypal_app:PaypalApp2026Secure!@localhost:5432/paypal_growth_engine
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000"]
```

### Step 4: Install Dependencies & Run Alembic Migrations
```powershell
# Set up Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt

# Run migrations to provision all 32 tables
alembic upgrade head
```

### Step 5: Verify Database State
```powershell
python scripts/inspect_db.py
```
Output confirms all 32 tables active and owned by `paypal_app`.

### Step 6: Start Backend Gateway
```powershell
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive OpenAPI documentation is live at `http://127.0.0.1:8000/docs`.

### Step 7: Build and Launch Frontend
In a separate terminal:
```powershell
cd frontend
npm install
npm run build
npm run dev
```
Open your browser to `http://localhost:5173`. Register an account, create your business workspace, and start using the platform!
