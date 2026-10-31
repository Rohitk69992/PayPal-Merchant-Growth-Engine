# AGENTIC_AI_DESIGN.md
## PayPal Merchant Growth Engine — Agentic AI Orchestration & Tooling
### PayPal AI Hackathon 2026

---

## 1. Role & Architectural Boundaries of Gemini

The **PayPal Merchant Growth Engine** leverages Google Gemini (Gemini 1.5 Pro / Gemini 3.8 Flash) not as a free-form conversational chatbot, but as an **orchestrated reasoning agent and decision synthesizer**.

### Primary Axioms
1. **Zero Math Hallucination**: Financial figures, balances, customer counts, and demand forecasts are fetched exclusively via strictly defined backend tools executing against PostgreSQL or the ML pipeline.
2. **Deterministic Preconditions**: The agent cannot execute destructive or consequential actions (e.g., executing supplier payments or sending bulk emails) autonomously. All agent recommendations transition into **Draft** states requiring Human-in-the-Loop merchant approval.
3. **Multi-Tenant Context Enforcement**: Every tool execution is implicitly scoped to the calling session's authenticated `merchant_id`. The LLM cannot query data across merchant boundaries.

---

## 2. Controlled Tool Declarations

The Gemini agent is configured with the following registered backend function signatures:

### 2.1 `get_merchant_overview`
*Purpose*: Retrieves active merchant details, connected PayPal account status, and 30-day top-line KPIs.
```json
{
  "name": "get_merchant_overview",
  "description": "Fetches top-line metrics including total balance, 30-day growth rate, active currencies, and PayPal account health.",
  "parameters": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

### 2.2 `get_customer_segments`
*Purpose*: Fetches current RFM cluster breakdown and geographic distributions.
```json
{
  "name": "get_customer_segments",
  "description": "Returns customer breakdown across VIP, Loyal, Returning, New, and At-Risk segments with spend metrics.",
  "parameters": {
    "type": "object",
    "properties": {
      "min_spend": { "type": "number", "description": "Optional minimum customer spend filter." }
    }
  }
}
```

### 2.3 `get_product_forecast`
*Purpose*: Retrieves time-series demand predictions for a specified SKU or top products.
```json
{
  "name": "get_product_forecast",
  "description": "Retrieves the statistical demand forecast for a product over the next 14 to 90 days.",
  "parameters": {
    "type": "object",
    "properties": {
      "product_id": { "type": "string", "description": "The unique product UUID or SKU." },
      "horizon_days": { "type": "integer", "description": "Forecast horizon (14, 30, or 90 days)." }
    },
    "required": ["product_id"]
  }
}
```

### 2.4 `get_inventory_status`
*Purpose*: Checks current stock levels, safety stock thresholds, and stockout risk indicators.
```json
{
  "name": "get_inventory_status",
  "description": "Lists inventory items categorized by IN_STOCK, LOW_STOCK, and OUT_OF_STOCK.",
  "parameters": {
    "type": "object",
    "properties": {
      "filter_status": { 
        "type": "string", 
        "enum": ["ALL", "LOW_STOCK", "CRITICAL"], 
        "description": "Filter criteria for inventory status." 
      }
    }
  }
}
```

### 2.5 `calculate_reorder_recommendation`
*Purpose*: Calculates deterministic replenishment quantities for a low-stock SKU.
```json
{
  "name": "calculate_reorder_recommendation",
  "description": "Calculates the exact replenishment quantity using lead-time demand, safety stock, and predicted growth.",
  "parameters": {
    "type": "object",
    "properties": {
      "product_id": { "type": "string", "description": "The product UUID or SKU." }
    },
    "required": ["product_id"]
  }
}
```

### 2.6 `generate_campaign_draft`
*Purpose*: Generates structured promotional campaign copy grounded in segment preferences.
```json
{
  "name": "generate_campaign_draft",
  "description": "Generates a marketing campaign draft targeted at a specific customer segment.",
  "parameters": {
    "type": "object",
    "properties": {
      "target_segment": { "type": "string", "enum": ["New Customers", "Returning", "Loyal", "VIP", "At-Risk"] },
      "category_focus": { "type": "string", "description": "Product category to feature." },
      "incentive_type": { "type": "string", "enum": ["PERCENTAGE_DISCOUNT", "FREE_SHIPPING", "EARLY_ACCESS"] }
    },
    "required": ["target_segment"]
  }
}
```

---

## 3. Structured Output & Response Schemas

To prevent malformed LLM responses, all conversational recommendations return structured JSON conforming to Pydantic models:

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class ActionableRecommendation(BaseModel):
    category: str = Field(description="Category of action: 'INVENTORY' or 'MARKETING'")
    headline: str = Field(description="Short, impactful recommendation headline")
    explanation: str = Field(description="Clear business rationale citing real data points")
    impact_projection: str = Field(description="Expected business outcome, e.g., '+15% margin'")
    primary_action_label: str = Field(description="CTA button text, e.g., 'Add to Order'")
    action_payload: dict = Field(description="Structured data for frontend modal or mutation")

class AgentResponse(BaseModel):
    summary: str = Field(description="Plain English executive summary for the merchant")
    recommendations: List[ActionableRecommendation]
    cited_metrics: List[str] = Field(description="List of verified data points referenced")
```

---

## 4. Human-in-the-Loop Approval Boundaries

| Action Type | Agent Capability | Merchant Action Required |
| :--- | :--- | :--- |
| **Inspect Balance / KPIs** | Autonomous Read | None (Read-only display) |
| **Cluster Customer Data** | Autonomous Read | None (Read-only display) |
| **Stock Replenishment** | Drafts Reorder Recommendation | **Mandatory Confirmation**: Merchant reviews supplier, quantity, and cost before purchase order is placed. |
| **Customer Marketing** | Drafts Copy & Discount Codes | **Mandatory Confirmation**: Merchant reviews headline, terms, and discount code before broadcast. |
| **Payment / Dispute Handling** | Drafts Evidence Summary | **Mandatory Confirmation**: Merchant signs off on evidence packet before submission to PayPal Disputes API. |

---

## 5. Fallback & Resiliency Architecture
1. **Tool Invocation Failure**: If a backend tool fails or times out, the agent gracefully informs the merchant and falls back to cached baseline statistics.
2. **Quota / Rate Limit Handling**: Automatic exponential backoff (1s, 2s, 4s) with circuit-breaker tripping after 3 consecutive failures.
3. **Auditing & Traceability**: Every agent prompt, selected tool call, returned arguments, and generated recommendation is logged in PostgreSQL with a unique `trace_id` for compliance review.
