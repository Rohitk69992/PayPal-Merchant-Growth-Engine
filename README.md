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

Comprehensive technical specifications are available in [`docs/`](./docs/):
- 📘 [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — End-to-end system topology, data flows, and design trade-offs.
- 🗄️ [`DATABASE.md`](./docs/DATABASE.md) — Relational ERD, table definitions, foreign keys, and indexes.
- 🔐 [`AUTHENTICATION.md`](./docs/AUTHENTICATION.md) — JWT lifecycle, Bcrypt hashing, and multi-tenant resolution.
- 💳 [`PAYPAL_INTEGRATION.md`](./docs/PAYPAL_INTEGRATION.md) — Mode A vs Mode B, Orders API v2, and Webhooks.
- 📊 [`DATA_PROVENANCE.md`](./docs/DATA_PROVENANCE.md) — Zero-mock policy and merchant state progression.
- 🧠 [`ML_PIPELINES.md`](./docs/ML_PIPELINES.md) — RFM mathematical formulas, Holt-Winters, and ROP safety stock.
- 🤖 [`AGENTIC_AI.md`](./docs/AGENTIC_AI.md) — Gemini orchestration, backend tools, and security guardrails.
- 📡 [`API_REFERENCE.md`](./docs/API_REFERENCE.md) — Complete OpenAPI v1 endpoint specifications and payloads.
- 🛡️ [`SECURITY.md`](./docs/SECURITY.md) — Symmetric secret encryption, tenant boundaries, OWASP mitigations.
- 🧪 [`TESTING.md`](./docs/TESTING.md) — Automated pytest suites and 12-step E2E verification script.
- 🚀 [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — Environment variables, database setup, and production builds.

Architecture reference documents from Phase 0 are in [`architecture/`](./architecture/).

---

## ⚡ Quick Start & Local Execution

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 2. Backend Setup
```bash
# Set up Python environment
pip install -r backend/requirements.txt

# Start FastAPI API Gateway
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger UI available at: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Merchant Dashboard available at: `http://localhost:5173`

---

## 🧪 Verification & Automated Testing

### Run Pytest Integration Suite
```bash
python -m pytest backend/tests -v
```
*Output: 4/4 test suites passed with 100% success.*

### Run End-to-End Platform Verification Script
```bash
python scripts/verify_platform.py
```
*Output: All 12 end-to-end lifecycle verification checks passed.*

### Build Production Frontend
```bash
cd frontend
npm run build
```
*Output: Compiled with 0 TypeScript / bundle errors.*

---

## 📜 License
Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.
