# SYSTEM_ARCHITECTURE.md
## PayPal Merchant Growth Engine — System Architecture Specification
### PayPal AI Hackathon 2026

---

## 1. High-Level Architecture Overview

The **PayPal Merchant Growth Engine** is architected as a high-performance, modular fintech platform designed with a clean separation of concerns across four distinct tiers:
1. **Presentation Tier (React Frontend)**: Rich, accessible, mobile-first responsive dashboard featuring interactive charts, real-time KPI displays, and assistive AI dialogs.
2. **Application & API Tier (FastAPI Backend)**: Asynchronous REST services providing multi-tenant authentication, transaction processing, inventory operations, and analytical aggregation.
3. **Data Science & ML Pipeline Tier**: Dedicated analytical services executing customer RFM segmentation, statistical time-series demand forecasting, and inventory optimization math.
4. **Agentic AI Orchestration Tier (Gemini Engine)**: Controlled reasoning engine executing structured function calls against validated backend APIs to explain business patterns and draft targeted strategies.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER (REACT)                       │
│  Home Dashboard │ Growth Engine │ Marketing │ Inventory │ Transactions │
│  Responsive UI  │ Tailwind CSS  │ Recharts  │ Demo / Live State Bridge │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS / REST (JSON)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    APPLICATION TIER (FASTAPI / PYTHON)                 │
│  ┌──────────────────────┬──────────────────────┬────────────────────┐  │
│  │ Auth & Multi-Tenancy │ PayPal Ingestion Svc │ Merchant Inventory │  │
│  ├──────────────────────┼──────────────────────┼────────────────────┤  │
│  │ Analytics Controller │ Webhook Processor    │ Agent Router       │  │
│  └──────────────────────┴──────────────────────┴────────────────────┘  │
└──────────────┬─────────────────────┬────────────────────┬──────────────┘
               │                     │                    │
               ▼                     ▼                    ▼
┌──────────────────────┐   ┌──────────────────┐  ┌───────────────────────┐
│     DATA TIER        │   │   ML & DS TIER   │  │   AGENTIC AI TIER     │
│   PostgreSQL 16      │   │ Scikit-learn RFM │  │ Gemini 1.5/3.8 Engine │
│   Row-Level Security │   │ Time-Series ROP  │  │ Controlled Tools Only │
│   Encrypted Vault    │   │ Forecast Engine  │  │ Structured Schema Val │
└──────────────────────┘   └──────────────────┘  └───────────────────────┘
               ▲
               │ Direct Sandbox Sync / Webhooks
┌──────────────┴─────────────────────────────────────────────────────────┐
│                    EXTERNAL: PAYPAL DEVELOPER PLATFORM                 │
│    OAuth2 v1/v2  │  Orders v2 API  │  Transaction Search  │  Webhooks  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Responsibilities

### 2.1 Presentation Tier (Frontend)
- **Role**: Render intuitive, mobile-responsive fintech dashboards reflecting the provided UI wireframes.
- **Key Responsibilities**:
  - Route navigation across all 8 primary application views.
  - Interactive data visualization (Recharts: line charts, donut charts, horizontal bar charts).
  - Responsive layout management (desktop sidebar, tablet drawer, mobile sticky navigation).
  - Client-side data management with clean decoupling between demo mocks and production API endpoints.
  - Form validation for inventory updates, SKU registration, and manual sales logs.
  - Modal workflows for campaign creation and inventory reorder confirmation.

### 2.2 Application Tier (Backend)
- **Role**: Secure, asynchronous orchestration hub enforcing business rules and multi-tenant boundaries.
- **Key Responsibilities**:
  - **Auth & Session Management**: Issue and verify JWT access tokens; attach `merchant_id` to every execution context.
  - **PayPal Connector**: Handle client credential token exchanges, query Orders and Transactions, and verify incoming webhook signatures.
  - **Data Ingestion & Normalization**: Transform raw PayPal transaction JSON into standardized transaction, customer, and order items.
  - **Inventory Service**: Manage merchant catalog, compute current stock, enforce reorder thresholds, and track supplier lead times.
  - **Tool Dispatcher for Gemini**: Expose read-only and permission-guarded tool functions for the agentic layer.

### 2.3 Data Science & ML Pipeline Tier
- **Role**: Execute rigorous numerical and statistical computations isolated from generative AI hallucinations.
- **Key Responsibilities**:
  - **RFM Segmentation Engine**: Extract recency, frequency, and monetary metrics; normalize with standard scalers; execute K-Means clustering; assign customers to interpretable business segments.
  - **Demand Forecasting Engine**: Ingest daily product sales history; fill missing date gaps; run moving-average and Holt-Winters exponential smoothing; generate 30/60/90-day SKU demand curves with confidence bounds.
  - **Inventory Optimization Logic**: Deterministically compute Safety Stock and Reorder Points (ROP) based on forecast variance and vendor lead times.

### 2.4 Agentic AI Orchestration Tier
- **Role**: Natural language reasoning, anomaly interpretation, and strategic recommendation copilot.
- **Key Responsibilities**:
  - Analyze outputs from ML clustering and demand forecasting.
  - Provide plain-English business rationales (e.g., explaining why stock should be ordered before seasonal peaks).
  - Draft contextual marketing campaigns (copy, discount suggestions, channel recommendation) tailored to specific customer segments.
  - Enforce Human-in-the-Loop guardrails: no order placement or campaign broadcast executes without explicit merchant confirmation.

---

## 3. Communication Contracts & Protocols

### 3.1 Frontend to Backend
- **Protocol**: HTTPS / RESTful JSON.
- **Authentication**: Bearer JWT tokens in `Authorization` headers.
- **Format**: Strictly typed Pydantic request and response schemas matching OpenAPI 3.1 specifications.
- **Error Handling**: Standardized RFC 7807 Problem Details for HTTP APIs:
  ```json
  {
    "type": "https://api.merchantgrowth.paypal/errors/insufficient-stock",
    "title": "Inventory Threshold Exceeded",
    "status": 400,
    "detail": "Requested order quantity exceeds maximum warehouse capacity.",
    "instance": "/merchants/m_1001/inventory/reorder"
  }
  ```

### 3.2 Backend to PayPal Developer Platform
- **Protocol**: HTTPS REST to `https://api-m.sandbox.paypal.com`.
- **Authentication**: OAuth 2.0 Client Credentials flow (`/v1/oauth2/token`) utilizing Sandbox `Client ID` and `Client Secret`.
- **Key Endpoints**:
  - `/v2/checkout/orders`: Capture and inspect customer payments.
  - `/v1/reporting/transactions`: Ingest historical merchant transaction records.
  - `/v1/notifications/webhooks`: Listen to asynchronous payment events (`PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`).
- **Signature Verification**: Validate incoming PayPal webhooks using the PayPal public certificate URL and CRC32 verification headers.

### 3.3 Backend to Gemini AI
- **Protocol**: Google GenAI SDK (gRPC / HTTPS).
- **Tool Protocol**: Gemini Function Calling / Tool Declarations.
- **Guaranteed Output**: Pydantic structured output validation (`response_schema`).

---

## 4. End-to-End Data Flows

### Flow 1: Transaction Sync to Demand Forecast Update
```
[PayPal Webhook / Poll] ──> [FastAPI Webhook Handler]
                                   │
                                   ▼
                         [Validate & Normalize]
                                   │
                         [PostgreSQL Transaction DB]
                                   │
                                   ▼
                       [Trigger ML Feature Store]
                                   │
                      ┌────────────┴────────────┐
                      ▼                         ▼
            [Update Customer RFM]     [Update SKU Daily Sales]
                      │                         │
                      ▼                         ▼
            [Assign Segment Cohort]   [Compute 30-Day Forecast]
                      │                         │
                      └────────────┬────────────┘
                                   │
                                   ▼
                     [Update Inventory ROP Alerts]
                                   │
                                   ▼
                   [Publish Event to Dashboard Cache]
```

### Flow 2: Merchant AI Copilot Interaction
```
[Merchant: "How can I boost repeat sales this month?"]
                        │
                        ▼
           [FastAPI /api/v1/agent/chat]
                        │
                        ▼
             [Gemini 1.5/3.8 Engine]
                        │ (Agent inspects prompt and calls tool)
                        ▼
       [Tool Call: get_customer_segments(merchant_id)]
                        │
                        ▼
      [FastAPI Internal Service reads DB / Cache]
                        │
                        ▼
 [Tool Result: {"At-Risk": 18%, "VIP": 12%, "AOV_VIP": $142}]
                        │
                        ▼
   [Tool Call: get_product_forecast(top_n=3)]
                        │
                        ▼
 [Tool Result: {"Wireless Headphones": "+42% demand projected"}]
                        │
                        ▼
          [Gemini Generates Synthesis & Strategy]
                        │
                        ▼
 [Merchant receives structured recommendation with 1-click CTA]
```

---

## 5. Security & Isolation Architecture

### 5.1 Multi-Tenant Merchant Isolation
- Every database entity contains an immutable `merchant_id` foreign key.
- All backend repository methods enforce:
  ```python
  query = db.query(Model).filter(Model.merchant_id == current_user.merchant_id)
  ```
- Optional PostgreSQL Row-Level Security (RLS) policies configured at the connection session level:
  ```sql
  SET LOCAL app.current_merchant_id = 'm_1001';
  ```

### 5.2 Secret & Credential Safety
- PayPal Sandbox Client Secrets and Gemini API keys are read exclusively from environment variables (`.env`).
- Never sent to or stored in frontend browser storage.
- In Merchant-Connected Mode, merchant-specific API tokens are encrypted at rest using AES-256-GCM before storage.

### 5.3 Agent Safety Boundaries
- The Gemini model possesses **zero write permissions** to payment or financial settlement APIs.
- Inventory reorders generated by the AI are staged as **Draft Purchase Orders**; physical or financial execution requires explicit merchant click-through confirmation.
- Marketing campaigns generated by the AI are staged as **Draft Campaigns**; no external emails or SMS are sent autonomously without merchant review.
