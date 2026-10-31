# PayPal Merchant Growth Engine — System Architecture

## 1. Executive Summary

The **PayPal Merchant Growth Engine** is an intelligent, multi-tenant fintech and business intelligence platform built around the PayPal Developer Platform. It elevates PayPal from a transactional payment processor into an active business growth partner for SMBs, digital startups, and omni-channel merchants.

The platform provides:
1. **Customer Intelligence**: Unsupervised behavioral clustering via Scikit-learn K-Means on empirical Recency, Frequency, and Monetary (RFM) distributions.
2. **Sales Intelligence & Forecasting**: Time-series demand forecasting using Statsmodels Holt-Winters Exponential Smoothing and rolling Moving Averages.
3. **Deterministic Inventory Automation**: Scientific Reorder Point ($ROP$) calculations incorporating supplier lead times, average daily demand, and statistical safety stocks.
4. **Agentic Decision Support**: Autonomous AI Copilot orchestrated with Google Gemini and controlled backend tools strictly scoped to merchant tenant boundaries.
5. **Real-Time PayPal Telemetry**: REST API v2 Orders Capture and asynchronous Webhook event processing.

---

## 2. Architectural Principles & Guarantees

### 2.1 The Zero-Fabrication Directive
The application strictly enforces a **no-fabricated-data policy**. There are zero hardcoded customer records, balances, or pre-rendered demonstration charts. Every user begins with a completely empty workspace. Analytical models and charts activate exclusively when verified database records cross mathematical thresholds.

### 2.2 Strict Multi-Tenancy
Tenancy is isolated at the database level. Every operational record (`Product`, `Transaction`, `Customer`, `DailySale`, `Order`) possesses an indexed foreign key to `MerchantProfile`. Every API query enforces tenancy through the `X-Merchant-ID` header and user membership validation. Cross-tenant access attempts immediately fail with HTTP 403 or 404.

### 2.3 Layered Separation of Concerns
```mermaid
graph TD
    Client[React 19 + TypeScript + Vite SPA] -->|REST / JSON + JWT| APIGateway[FastAPI Application Gateway]
    APIGateway --> CoreSec[Authentication & Tenant Dependency Injectors]
    CoreSec --> V1Routes[API v1 Routers: Auth, Products, Sales, PayPal, Analytics, Agent]
    V1Routes --> MLPipelines[Data Science & ML Engine: Scikit-learn + Statsmodels]
    V1Routes --> AgentEngine[Agentic AI Engine: Gemini 1.5/2.0 + Deterministic Tools]
    V1Routes --> DB[(PostgreSQL / SQLite Dual Engine via SQLAlchemy ORM)]
    V1Routes --> PayPalAPI[PayPal Developer Platform: OAuth2, Orders v2, Webhooks]
```

---

## 3. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite | High-performance reactive rendering with zero bundle overhead and strict type verification. |
| **Styling & Design** | Tailwind CSS v4, Lucide Icons, Recharts | PayPal fintech blue aesthetic, responsive fluid container layouts without simulated smartphone frames. |
| **Backend Framework** | FastAPI (Python 3.11), Pydantic v2 | High-throughput asynchronous endpoints with automatic OpenAPI schema generation and runtime data validation. |
| **Database & ORM** | PostgreSQL (Primary) / SQLite (Fallback), SQLAlchemy 2.0 | Dual-mode persistent relational engine supporting acid compliance, foreign keys, and multi-tenancy indexes. |
| **Machine Learning** | Scikit-learn, Statsmodels, Pandas, NumPy | Battle-tested, mathematically rigorous unsupervised clustering and exponential smoothing time-series modeling. |
| **AI Orchestration** | Google Gemini API (`google-genai`), Python Dispatcher | Grounded natural language reasoning with controlled tool execution and deterministic fallback response generation. |
| **Fintech Integration**| PayPal REST API v2, Webhooks, Sandbox Simulator | Standardized merchant payment capture and webhook ingestion with symmetrical secret encryption. |

---

## 4. End-to-End Data Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Buyer
    actor Merchant
    participant UI as React Dashboard
    participant API as FastAPI Backend
    participant DB as Relational Database
    participant ML as ML & Analytics Engine
    participant Agent as Gemini Agentic Copilot

    Merchant->>UI: 1. Adds Product Master Records (SKU, Price, Lead Time)
    UI->>API: POST /api/v1/products
    API->>DB: Stores Product & initial Inventory Movement

    Buyer->>API: 2. Completes PayPal Checkout / Simulator
    API->>API: Calculates standard fee (2.9% + $0.30)
    API->>DB: Records Transaction, Order, and Customer
    API->>DB: Decrements Product stock on hand

    Merchant->>UI: 3. Navigates to Inventory Assistant
    UI->>API: GET /api/v1/analytics/forecasts/{product_id}
    API->>ML: Checks sales history length
    alt Sales Days < 5
        ML-->>API: Status: INSUFFICIENT_DATA (Transparent scientific notice)
    else Sales Days >= 5
        ML-->>API: Fits Holt-Winters model & 95% Confidence Intervals
    end
    API-->>UI: Renders projected demand trajectory & calculated ROP

    Merchant->>UI: 4. Asks AI Copilot: "What should I reorder?"
    UI->>API: POST /api/v1/agent/chat
    API->>Agent: Dispatches prompt with merchant context
    Agent->>API: Executes get_inventory_status & calculate_reorder_recommendation
    API-->>Agent: Returns stock levels and calculated replenishment units
    Agent-->>UI: Synthesizes actionable business recommendation with PO draft CTA
```
