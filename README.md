# PayPal Merchant Growth Engine 🚀
### AI-Powered Fintech & Merchant Intelligence Platform
**PayPal AI Hackathon 2026**

---

## 📌 Overview

The **PayPal Merchant Growth Engine** transforms PayPal from merely a transactional payment gateway into an intelligent business growth partner for small-and-medium businesses (SMBs), independent merchants, and direct-to-consumer (D2C) startups.

By analyzing real-time PayPal transaction streams alongside merchant catalog and inventory data, the platform provides automated, machine-learning-driven answers to mission-critical questions:
- **Who are my most valuable customers?** (RFM Customer Segmentation)
- **Which products will experience demand surges?** (Time-Series Holt-Winters Forecasting)
- **When should I replenish inventory to prevent stockouts?** (Deterministic Reorder Point Calculation)
- **How can I run high-ROI targeted promotions?** (Segment-grounded AI Campaign Generation)
- **What are my exact cross-border & processing fees?** (Fee Transparency Engine & Dispute Safeguards)

---

## 🏛️ System Architecture

The platform is designed as a decoupled, multi-tenant fintech platform across four distinct layers:

```
┌────────────────────────────────────────────────────────┐
│             PRESENTATION TIER (REACT + VITE)           │
│  Home Dashboard │ Growth Hub │ Marketing │ Inventory   │
│  Transactions   │ Crypto     │ Rewards   │ Health      │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON
                            ▼
┌────────────────────────────────────────────────────────┐
│             APPLICATION TIER (FASTAPI / PYTHON)        │
│  Auth & Multi-Tenancy │ PayPal Ingestion Svc │ Orders  │
│  Webhook Processor    │ Tool Dispatcher      │ Catalog │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│       DATA & ML TIER    │   │      AGENTIC AI TIER     │
│   PostgreSQL 16 Multi-T │   │   Google Gemini 1.5/3.8  │
│   Scikit-learn RFM      │   │   Controlled Tool Calls  │
│   Holt-Winters Forecast │   │   Human-in-the-Loop Appr │
└─────────────────────────┘   └──────────────────────────┘
```

Detailed architectural blueprints are available in [`architecture/`](./architecture/):
- [Project Overview & Business Objectives](./architecture/PROJECT_OVERVIEW.md)
- [System Architecture Specification](./architecture/SYSTEM_ARCHITECTURE.md)
- [Relational Database Design & ERD](./architecture/DATABASE_DESIGN.md)
- [API Contracts & Endpoint Specs](./architecture/API_CONTRACTS.md)
- [Data Science & ML Pipeline Design](./architecture/ML_DESIGN.md)
- [Agentic AI & Gemini Tooling Specification](./architecture/AGENTIC_AI_DESIGN.md)
- [Phased Implementation Roadmap](./architecture/IMPLEMENTATION_ROADMAP.md)

---

## ✨ Implemented Core Screens (Phase 1)

1. **Home Dashboard** (`/`): Real-time PayPal balance (`$12,580.32`), 30-day growth rate (`+12%`), asset balances (USD, BTC, Rewards), Growth Engine banner, and Account Health indicators.
2. **Merchant Growth Engine Hub** (`/grow`): Strategic value proposition and direct entry points into customer intelligence and inventory replenishment.
3. **AI Marketing Insights** (`/marketing`): Interactive Donut chart displaying RFM segments (New Customers 42%, Returning 28%, Loyal 20%, VIP 10%), geographic customer density (Mumbai 32%, Bengaluru 24%, Delhi 18%), and category preferences.
4. **AI Inventory Assistant** (`/inventory`): Holt-Winters demand forecast line chart showing `+42%` holiday demand spike, stock-on-hand tracking, and AI reorder recommendations with 1-click purchase order execution.
5. **Transactions** (`/transactions`): Filterable PayPal payment records with search, status indicators, and fee inspection drawers.
6. **Crypto** (`/crypto`): Asset valuation chart, quick actions (Buy, Sell, Swap), and cryptocurrency holdings breakdown.
7. **PayPal Rewards** (`/rewards`): Points balance (`2,450 pts` ≈ `$24.50 USD`), redeemable for cash back or fee discounts.
8. **Account Health** (`/account-health`): Continuous system security checks, fee schedules, and an **Interactive Fee Estimator** solving fee opacity for cross-border payments.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide Icons, React Router DOM.
- **Backend (Phase 2)**: Python 3.11, FastAPI, SQLAlchemy, Alembic, Pydantic v2.
- **Database**: PostgreSQL 16 with tenant-scoped isolation.
- **Data Science & ML**: NumPy, Pandas, Scikit-learn (K-Means), Statsmodels (Holt-Winters Exponential Smoothing).
- **Agentic AI**: Google Gemini API with controlled backend tool declarations and structured output validation.
- **Payment Infrastructure**: PayPal Developer Platform (Sandbox, Orders v2 API, Transaction Reporting, Webhooks).

---

## 🚀 Quickstart: Running the Frontend

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Execution
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at `http://localhost:5173/` to explore the interactive merchant dashboard.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
