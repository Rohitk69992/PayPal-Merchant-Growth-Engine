# PROJECT_OVERVIEW.md
## PayPal Merchant Growth Engine — AI-Powered Merchant Intelligence Platform
### PayPal AI Hackathon 2026

---

## 1. Executive Summary & Problem Statement

Small-and-medium businesses (SMBs), independent merchants, and direct-to-consumer (D2C) startups process millions of transactions through PayPal daily. However, for most small merchants, PayPal remains purely an opaque payment rail—a digital cash register that collects funds, deducts transaction processing fees, and occasional reserves.

While enterprise merchants deploy dedicated business intelligence teams, data engineering pipelines, and specialized ERPs (e.g., SAP, Salesforce Commerce Cloud), SMBs lack the technical and analytical infrastructure to transform transaction logs into actionable growth decisions. They face recurring, high-friction operational questions:
- **Customer Blindspots**: Who are our highest-value customers? Which previously loyal shoppers are slipping away into churn? Where are customers geographically concentrated?
- **Sales & Demand Ambiguity**: Which products generate repeat purchases versus one-off sales? How will seasonal shifts impact category demand over the next 30 to 90 days?
- **Inventory & Working Capital Friction**: When should stock be replenished to prevent stockouts without tying up scarce working capital in excess safety stock?
- **Marketing Inefficiency**: How can promotions be targeted to distinct customer segments (e.g., VIP vs. At-Risk vs. First-Time) rather than blasting generic discounts that erode margin?
- **Account & Cash Flow Anxiety**: Merchants often experience anxiety around sudden account holds, fee confusion (cross-border, FX markup, interchange), and slow dispute resolutions.

The **PayPal Merchant Growth Engine** transforms PayPal from a transactional utility into an indispensable **Growth Partner**. By combining real-time PayPal transaction streams, merchant product catalogs, classical statistical machine learning (RFM clustering and time-series demand forecasting), and agentic Gemini AI reasoning, the platform empowers merchants with automated, data-driven decision intelligence.

---

## 2. Target Users & Personas

| Persona | Role | Key Pain Points | Core Platform Value |
| :--- | :--- | :--- | :--- |
| **Aanya Sharma** *(Primary)* | Solo Founder & D2C Merchant (Electronics & Accessories) | Limited time, manually checks stock, runs untargeted email blasts, fears stockouts on bestsellers. | Unified dashboard, automated RFM segmentation, AI inventory reorder alerts with lead-time calculations, one-click targeted marketing campaigns. |
| **David Miller** | Growing Multi-Channel Retailer ($30k/mo PayPal GMV) | High dispute volume, opaque cross-border FX fees, needs supplier replenishment lead-time planning. | Proactive account health transparency, clear fee breakdowns, demand forecasting per SKU, AI dispute copilot. |
| **Elena Rostova** | Boutique Fashion & Apparel Merchant | Seasonal spikes, high return/refund rates, struggling to identify VIP customer repeat purchasing cycles. | Visual customer cohort analysis, repeat purchase velocity insights, automated retention campaign drafts. |

---

## 3. Business Objectives & Value Proposition

### 3.1 Business Objectives
1. **Drive PayPal GMV & Retention**: By increasing merchant sales through intelligent retention campaigns and preventing out-of-stock revenue loss, PayPal's transaction volume grows proportionally.
2. **Elevate Merchant Stickiness**: Embed PayPal into daily operational workflows (inventory reorders, marketing, account health), increasing switching costs to competing payment processors.
3. **Mitigate Transaction Disputes & Friction**: Proactive account health indicators and transparent fee analytics eliminate merchant anxiety and dispute overhead.

### 3.2 Continuous Growth Engine Workflow
```
[PayPal Transactions & Webhooks] + [Merchant Catalog & Inventory]
                          │
                          ▼
            [Data Normalization & Multi-Tenant Isolation]
                          │
                          ▼
            ┌─────────────┴─────────────┐
            ▼                           ▼
[RFM Customer Segmentation]     [SKU Demand Forecasting]
(K-Means & Feature Scaling)     (Moving Average + Holt-Winters)
            │                           │
            └─────────────┬─────────────┘
                          │
                          ▼
            [Deterministic Business Rules]
    (Safety Stock, Reorder Point, Lead Time Alerts)
                          │
                          ▼
          [Gemini Agentic AI Reasoning Layer]
    (Controlled Function Calling, Safe Recommendations)
                          │
                          ▼
            [Actionable Merchant Decision Hub]
    (One-Click Campaign Drafts, 1-Click Purchase Orders)
```

---

## 4. Core Features & Capabilities

### 4.1 Customer Intelligence
- **Automated RFM Segmentation**: Calculates Recency (days since last purchase), Frequency (total transaction count), and Monetary Value (total spend) per customer.
- **Clustering & Profiles**: Categorizes customer base into actionable cohorts: *VIP Champions*, *Loyal High-Spenders*, *Promising / Returning*, *New Shoppers*, and *At-Risk / Inactive*.
- **Geographic & Category Affinity**: Aggregates customer location distribution and category purchasing preferences.

### 4.2 Sales Intelligence
- **Real-Time Revenue Tracking**: Metrics for Gross Merchandise Value (GMV), average order value (AOV), net volume after fees, and transaction velocity.
- **Trend & Period Comparisons**: Day-over-day, week-over-week, and month-over-month sales trends with comparative growth percentages.
- **Channel & Payment Breakdown**: Domestic vs. cross-border volume, fiat vs. rewards/crypto breakdowns.

### 4.3 AI Inventory Assistant
- **Product Catalog Management**: Track SKU, cost price, retail price, stock on hand, lead times, and supplier details.
- **Daily SKU Demand Forecasting**: 30-day and 90-day time-series projections based on historical transaction velocity and seasonality.
- **Deterministic Reorder Logic**: Calculates:
  $$\text{Reorder Point (ROP)} = (\text{Daily Demand} \times \text{Lead Time}) + \text{Safety Stock}$$
- **Stockout Warning System**: Traffic-light indicators (Healthy, Low Stock, Critical Stockout Risk) with automated replenishment suggestions.

### 4.4 AI Marketing Copilot
- **Segment-Driven Strategy**: Generates hyper-targeted campaign concepts mapped directly to customer segments (e.g., VIP exclusive pre-orders vs. At-Risk win-back incentives).
- **Campaign Draft Generator**: Uses Gemini to produce multi-channel copy (email subject lines, SMS previews, promotional discount codes) grounded in real transaction figures.
- **Clear Business Explanations**: Explains the mathematical reasoning behind why a specific customer cohort was targeted.

### 4.5 PayPal Core Integration & Transparency
- **Sandbox Transaction Ingestion**: Live synchronization with PayPal Orders and Payments API.
- **Fee Transparency Engine**: Explicit calculation and display of domestic processing, international cross-border surcharges, and FX conversion fees.
- **Account Health Monitor**: Continuous verification of account standing, API credential connectivity, and dispute posture.

---

## 5. User Journeys

### Journey 1: Morning Merchant Briefing
1. Merchant opens the **PayPal Merchant Growth Engine** dashboard.
2. Views real-time PayPal balance, 30-day revenue growth (+12%), and Account Health status (All systems secure).
3. Sees immediate AI Growth recommendation: *"Wireless Headphones demand is projected to spike +42% over the holiday season; 80 units remaining with 14-day supplier lead time."*
4. Clicks **Add to Order** to review suggested replenishment quantity (120 units).

### Journey 2: Retaining At-Risk Customers
1. Merchant navigates to **Marketing Insights**.
2. Inspects customer segmentation donut chart: identifies that 20% of customer base is slipping into the *At-Risk* category.
3. Clicks **Create Targeted Campaign**.
4. The AI Marketing Copilot generates a personalized win-back offer with recommended discount parameters grounded in the segment's historical AOV.
5. Merchant approves the campaign draft for export to email marketing channels.

### Journey 3: Transaction Audit & Fee Analysis
1. Merchant opens **Transactions** to review recent orders.
2. Filters by *Received*, *Sent*, or payment type.
3. Inspects a cross-border transaction to view the exact breakdown of PayPal standard fee (2.9% + \$0.30) and currency conversion margin (1.5%).

---

## 6. Functional & Non-Functional Requirements

### 6.1 Functional Requirements
- **FR-1 Multi-Tenancy**: Complete data isolation across separate merchant accounts.
- **FR-2 Data Separation**: Strict distinction between verified PayPal transaction records, merchant-entered catalog data, and synthetic demonstration data.
- **FR-3 Deterministic Math**: All inventory thresholds and financial summaries computed via verified formulas, never fabricated by LLMs.
- **FR-4 Controlled AI Calling**: Gemini agent accesses operational data exclusively through authorized, validated backend tools.
- **FR-5 Human-in-the-Loop**: Consequential actions (reorders, campaign triggers) require explicit merchant confirmation.

### 6.2 Non-Functional Requirements
- **NFR-1 Performance**: Sub-200ms API response time for cached analytics; sub-1.5s response for Gemini agent tool orchestration.
- **NFR-2 Security**: Strict adherence to OWASP Top 10, zero plaintext secret storage, PCI-DSS compliance awareness (no raw credit card numbers stored; PayPal tokenized payments only).
- **NFR-3 Responsiveness**: Flawless UI rendering across mobile (375px+), tablet (768px+), and desktop (1024px+ to 4K).
- **NFR-4 Maintainability**: Fully typed TypeScript/Python contracts, modular directory structure, comprehensive unit and integration test readiness.

---

## 7. Hackathon Compliance Matrix

| Requirement | PayPal AI Hackathon 2026 Target | Architecture Solution |
| :--- | :--- | :--- |
| **PayPal Sandbox Integration** | Free sandbox environment must be central | Direct OAuth2 token exchange, Orders API capture, Transaction Search, Webhook listeners. |
| **AI / ML Integration** | Genuine AI model integration | Gemini 1.5/3.8 function-calling agent + Scikit-learn RFM clustering + statistical time-series forecasting. |
| **PayPal Centrality** | Core, not a side feature | Every analytics metric, customer cohort, and cash flow figure originates from or anchors to PayPal transaction logs. |
| **Working Application** | Functional, not a static mockup | Full responsive React frontend with interactive filters, backed by deterministic logic and FastAPI endpoints. |
| **Public Repository & License** | Open-source with clean commit history | MIT License, clean modular code, comprehensive README with setup commands. |
| **Demonstration Video** | High-impact <3 min YouTube demo | Scripted walkthrough highlighting problem, live PayPal sandbox capture, ML demand forecast, and AI Copilot action. |
