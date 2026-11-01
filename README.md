# PayPal Merchant Growth Engine 🚀
### AI-Powered Fintech & Merchant Intelligence Platform
**PayPal AI Hackathon 2026**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.6+-F7931E.svg)](https://scikit-learn.org/)
[![Statsmodels](https://img.shields.io/badge/Statsmodels-0.14+-4682B4.svg)](https://www.statsmodels.org/)

---

## 📌 Executive Summary

The **PayPal Merchant Growth Engine** elevates the PayPal Developer Platform from merely a payment processor into an active, intelligent business partner for SMBs, digital startups, and omni-channel merchants.

Small business owners process customer payments but often lack the infrastructure and machine learning expertise to convert raw transaction streams into actionable growth decisions:
- *Who are my most valuable customers?* → **Scikit-learn K-Means RFM Cohort Clustering**
- *Which products will experience demand surges?* → **Statsmodels Holt-Winters Exponential Smoothing**
- *When should I replenish inventory to avoid stockouts?* → **Deterministic Reorder Point ($ROP$) Math**
- *How can I launch targeted promotions with positive ROI?* → **Segment-grounded Marketing Strategies**
- *How can I ask questions about my business?* → **Agentic AI Copilot (Gemini API with controlled backend tools)**

---

## 🛡️ The Zero-Fabrication Directive

This platform strictly enforces a **no-fabricated-data policy**:
1. **Clean-Slate Baseline**: New users register, onboard their business, and start with completely genuine, zero-balance dashboards. There are no pre-populated fake names, balances, or synthetic customers.
2. **Data-Driven ML Triggers**: Scikit-learn RFM clustering and Holt-Winters forecasting activate strictly when empirical database records satisfy mathematical criteria ($\ge 4$ customers, $\ge 5$ sales days). When data is sparse, the system transparently reports an `INSUFFICIENT_DATA` state.
3. **Responsive Web Design**: Built using fluid, standard CSS flexbox/grid containers. No simulated smartphone frames, artificial notches, or phone status bars.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│            PRESENTATION TIER (REACT 19 + VITE)         │
│  Home Dashboard │ Catalog & Products │ Daily Sales     │
│  AI Inventory   │ AI Marketing (RFM) │ Transactions    │
│  PayPal Connect │ Settings & Audit   │ AI Copilot      │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (JWT + Tenant Headers)
                            ▼
┌────────────────────────────────────────────────────────┐
│            APPLICATION TIER (FASTAPI / PYTHON 3.11)    │
│  Auth (Bcrypt + JWT) │ Multi-Tenancy Resolution (RBAC) │
│  Product & Sales API │ Inventory Reorder Engine        │
│  PayPal REST v2 Svc  │ Webhook Idempotency Ingestion   │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│      DATA & ML TIER     │   │      AGENTIC AI TIER     │
│   PostgreSQL / SQLite   │   │   Google Gemini API      │
│   Scikit-learn RFM      │   │   Controlled Tool Calls  │
│   Holt-Winters Forecast │   │   Strict Tenant Scoping  │
│   Audit Trail Ledger    │   │   Deterministic Fallback │
└─────────────────────────┘   └──────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies | Key Highlights |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts | Fast SPA, zero fake data, responsive layouts. |
| **Backend** | FastAPI, Python 3.11, Pydantic v2, Uvicorn | Async performance, strict schema validation, OpenAPI docs. |
| **Database** | PostgreSQL 15+ / SQLite dual-mode, SQLAlchemy 2.0 | Multi-tenant tenant-keyed tables, ACID transactions. |
| **Machine Learning** | Scikit-learn, Statsmodels, Pandas, NumPy | Unsupervised K-Means clustering, exponential smoothing. |
| **Agentic AI** | Google Gemini (`google-genai`), Python Dispatcher | Grounded Copilot with persistent tool execution audit logs. |
| **Payments** | PayPal REST API v2, Orders Capture, Webhooks | Mode A & Mode B connect, symmetric secret encryption. |

---

## 📂 Documentation Directory

Comprehensive technical specifications and operations guides are available in [`docs/`](./docs/):
- 📘 [`DATABASE_ARCHITECTURE.md`](./docs/DATABASE_ARCHITECTURE.md) — Complete database inventory, entity-relationship models, and table mapping.
- 🗄️ [`DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) — Comprehensive schema documentation for all 32 PostgreSQL tables.
- 💻 [`DATABASE_SETUP_LOCAL.md`](./docs/DATABASE_SETUP_LOCAL.md) — Step-by-step local-first PostgreSQL installation and configuration guide.
- 🔄 [`MIGRATIONS_GUIDE.md`](./docs/MIGRATIONS_GUIDE.md) — Alembic migration workflows, generation, inspection, and rollback procedures.
- 🔐 [`AUTHENTICATION.md`](./docs/AUTHENTICATION.md) — Argon2id hashing, stateful session tokens, password resets, and Google OIDC.
- 🌐 [`GOOGLE_OAUTH_SETUP.md`](./docs/GOOGLE_OAUTH_SETUP.md) — Google Cloud Console credentials and OpenID Connect configuration.
- 🏢 [`MERCHANT_MANAGEMENT_AND_MULTI_TENANCY.md`](./docs/MERCHANT_MANAGEMENT_AND_MULTI_TENANCY.md) — Multi-tenant architecture, workspace switching, and RBAC rules.
- 📦 [`BUSINESS_DATA_PERSISTENCE.md`](./docs/BUSINESS_DATA_PERSISTENCE.md) — Product catalogs, inventory ledger, daily sales, and transaction idempotency.
- 🧠 [`ML_AND_AI_PERSISTENCE.md`](./docs/ML_AND_AI_PERSISTENCE.md) — Scikit-learn RFM clustering and Statsmodels Holt-Winters model tracking.
- 🎨 [`FRONTEND_INTEGRATION_AND_ALIGNMENT.md`](./docs/FRONTEND_INTEGRATION_AND_ALIGNMENT.md) — API client routes, parameter normalization, and React UI alignment.
- 🛡️ [`SECURITY_AND_TESTING_VERIFICATION.md`](./docs/SECURITY_AND_TESTING_VERIFICATION.md) — Threat model mitigations, SQL injection tests, and test results.
- ⚙️ [`ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md) — Comprehensive environment configuration reference.

---

## ⚡ Quick Start & Local Execution

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL 15+ (Local-first, running on port 5432)

### 2. Database Setup
```bash
# Apply Alembic database migrations to local PostgreSQL
alembic upgrade head
```

### 3. Backend Setup
```bash
# Set up Python environment
pip install -r backend/requirements.txt

# Start FastAPI API Gateway
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger UI available at: `http://127.0.0.1:8000/docs`

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Merchant Dashboard available at: `http://localhost:5173`

---

## 🧪 Verification & Automated Testing

### Run Pytest Integration & Security Suite (34/34 Passing)
```powershell
$env:PYTHONPATH="."
pytest backend/tests/ -v
```

### Build Production Frontend (0 Errors)
```bash
cd frontend
npm run build
```

---

## 📜 License
Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.
