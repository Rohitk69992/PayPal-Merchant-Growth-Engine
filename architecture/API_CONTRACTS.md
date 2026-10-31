# API_CONTRACTS.md
## PayPal Merchant Growth Engine — API Specifications & Endpoint Contracts
### PayPal AI Hackathon 2026

---

## 1. Global Standards & Conventions
- **Base URL**: `/api/v1`
- **Data Format**: `application/json`
- **Date Format**: ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`)
- **Monetary Format**: Decimals serialized as fixed numeric strings or floats rounded to 2 decimal places with currency tag.
- **Authentication**: `Authorization: Bearer <JWT>` header on all protected routes.
- **Multi-Tenant Context**: Injected automatically via backend token validation; never accepted as an arbitrary query parameter from untrusted clients.

---

## 2. Authentication & Merchant Management

### 2.1 `POST /auth/login`
Authenticate a merchant operator.
```json
// Request
{
  "email": "aanya@merchant.com",
  "password": "SecurePassword123!"
}

// Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "u_9918",
    "email": "aanya@merchant.com",
    "full_name": "Aanya Sharma",
    "role": "ADMIN",
    "merchant_id": "m_1001",
    "business_name": "Aanya Tech & Gear"
  }
}
```

### 2.2 `GET /merchants/me`
Retrieve active merchant profile and connection health.
```json
// Response: 200 OK
{
  "id": "m_1001",
  "business_name": "Aanya Tech & Gear",
  "currency": "USD",
  "connection_mode": "SANDBOX",
  "paypal_connected": true,
  "account_health": {
    "status": "SECURE",
    "system_checks": {
      "login_device": "No unusual activity",
      "payments": "No issues detected",
      "card_bank": "Verified",
      "crypto": "Secure",
      "rewards": "Active"
    },
    "fee_schedule": {
      "domestic_us": "2.9% + $0.30",
      "international": "3.9% + $0.30",
      "currency_conversion": "1.5%",
      "crypto_trade": "1.49%"
    }
  }
}
```

---

## 3. PayPal Integration Endpoints

### 3.1 `POST /paypal/connect-sandbox`
Configure sandbox API credentials.
```json
// Request
{
  "client_id": "AYSq3RDG...",
  "client_secret": "ELk...",
  "environment": "SANDBOX"
}

// Response: 200 OK
{
  "status": "CONNECTED",
  "environment": "SANDBOX",
  "merchant_payer_id": "PAYER_SAMPLE_123",
  "webhook_registered": true
}
```

### 3.2 `POST /paypal/webhooks`
Receive asynchronous PayPal IPN/Webhook events.
```json
// Request from PayPal
{
  "id": "WH-908123-123",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource_type": "capture",
  "summary": "Payment completed for $89.99 USD",
  "resource": {
    "id": "CAP-12398",
    "amount": { "value": "89.99", "currency_code": "USD" },
    "seller_receivable_breakdown": {
      "gross_amount": { "value": "89.99", "currency_code": "USD" },
      "paypal_fee": { "value": "2.91", "currency_code": "USD" },
      "net_amount": { "value": "87.08", "currency_code": "USD" }
    }
  }
}

// Response: 200 OK
{
  "received": true,
  "processed": true
}
```

---

## 4. Financial & Transaction Analytics

### 4.1 `GET /transactions`
List transaction history with filtering.
```json
// Query Params: ?page=1&limit=10&status=COMPLETED&type=ALL&search=Acme
// Response: 200 OK
{
  "total_records": 142,
  "page": 1,
  "limit": 10,
  "summary": {
    "total_balance": 12580.32,
    "last_30_days_growth_pct": 12.0,
    "usd_balance": 8240.15,
    "crypto_value_usd": 2130.47,
    "rewards_points": 2450,
    "rewards_value_usd": 24.50
  },
  "items": [
    {
      "id": "tx_001",
      "title": "Nike Store",
      "date": "2025-11-02T14:22:00Z",
      "type": "PAYMENT",
      "amount": -89.99,
      "currency": "USD",
      "status": "COMPLETED",
      "source": "CARD"
    },
    {
      "id": "tx_002",
      "title": "Acme Co.",
      "date": "2025-11-01T09:15:00Z",
      "type": "RECEIVED",
      "amount": 450.00,
      "currency": "USD",
      "status": "COMPLETED",
      "source": "PAYPAL_WALLET"
    }
  ]
}
```

---

## 5. Customer Intelligence & Segmentation

### 5.1 `GET /analytics/customer-segments`
Retrieve aggregated RFM customer segments and geographic distributions.
```json
// Response: 200 OK
{
  "segments": [
    {
      "name": "New Customers",
      "percentage": 42.0,
      "count": 185,
      "avg_spend": 58.40,
      "color": "#3B82F6"
    },
    {
      "name": "Returning",
      "percentage": 28.0,
      "count": 123,
      "avg_spend": 112.50,
      "color": "#10B981"
    },
    {
      "name": "Loyal",
      "percentage": 20.0,
      "count": 88,
      "avg_spend": 245.00,
      "color": "#F59E0B"
    },
    {
      "name": "VIP",
      "percentage": 10.0,
      "count": 44,
      "avg_spend": 580.20,
      "color": "#6366F1"
    }
  ],
  "top_locations": [
    { "city": "Mumbai", "percentage": 32.0 },
    { "city": "Bengaluru", "percentage": 24.0 },
    { "city": "Delhi", "percentage": 18.0 },
    { "city": "Pune", "percentage": 12.0 },
    { "city": "Other", "percentage": 14.0 }
  ],
  "category_preferences": [
    { "category": "Electronics", "percentage": 34.0, "icon": "headphones" },
    { "category": "Fashion", "percentage": 28.0, "icon": "shirt" },
    { "category": "Home & Living", "percentage": 18.0, "icon": "armchair" },
    { "category": "Others", "percentage": 20.0, "icon": "grid" }
  ]
}
```

---

## 6. Products & Inventory Assistant

### 6.1 `GET /inventory/status`
List products, stock status, and reorder signals.
```json
// Response: 200 OK
{
  "summary": {
    "total_products": 28,
    "low_stock_count": 3,
    "out_of_stock_count": 0
  },
  "items": [
    {
      "id": "prod_01",
      "sku": "WH-1000XM5",
      "name": "Wireless Headphones",
      "category": "Electronics",
      "stock_on_hand": 80,
      "status": "IN_STOCK",
      "reorder_threshold": 30,
      "lead_time_days": 14,
      "unit_cost": 45.00,
      "unit_price": 99.99
    },
    {
      "id": "prod_02",
      "sku": "SW-V2",
      "name": "Smart Watch",
      "category": "Electronics",
      "stock_on_hand": 15,
      "status": "LOW_STOCK",
      "reorder_threshold": 25,
      "lead_time_days": 10,
      "unit_cost": 70.00,
      "unit_price": 149.99
    },
    {
      "id": "prod_03",
      "sku": "BP-URBAN",
      "name": "Backpack",
      "category": "Accessories",
      "stock_on_hand": 60,
      "status": "IN_STOCK",
      "reorder_threshold": 20,
      "lead_time_days": 7,
      "unit_cost": 18.00,
      "unit_price": 49.99
    }
  ]
}
```

### 6.2 `GET /inventory/forecast/{product_id}`
Retrieve time-series demand forecast.
```json
// Response: 200 OK
{
  "product_id": "prod_01",
  "product_name": "Wireless Headphones",
  "growth_projection_pct": 42.0,
  "forecast_period": "Next 3 months",
  "recommendation": {
    "recommended_units": 120,
    "target_order_date": "2025-11-15",
    "rationale": "Based on your sales trend and seasonal demand, we suggest ordering 120 units in the next 2 weeks to prevent stockout during December peak."
  },
  "datapoints": [
    { "month": "Nov", "sales": 65, "projected": 70 },
    { "month": "Dec", "sales": null, "projected": 115 },
    { "month": "Jan", "sales": null, "projected": 85 }
  ]
}
```

---

## 7. Agentic AI & Marketing Copilot

### 7.1 `POST /agent/generate-campaign`
Generate a targeted marketing campaign concept via Gemini.
```json
// Request
{
  "target_segment": "New Customers",
  "focus_category": "Electronics",
  "goal": "Drive second purchase within 14 days"
}

// Response: 200 OK
{
  "campaign_id": "cmp_882",
  "segment": "New Customers",
  "headline": "Unlock 15% Off Your Next Tech Upgrade",
  "email_subject": "Loved your first order, Aanya? Here's an exclusive VIP treat",
  "body_copy": "Thanks for joining the Aanya Tech family! Because you love top-tier electronics, enjoy 15% off your next wireless audio accessory when you pay with PayPal. Offer valid for 7 days.",
  "suggested_discount_code": "PAYPALGROW15",
  "suggested_discount_pct": 15.0,
  "estimated_reach": 185,
  "expected_conversion_rate_pct": 6.8
}
```

### 7.2 `POST /inventory/reorder/confirm`
Approve and execute an inventory reorder recommendation.
```json
// Request
{
  "product_id": "prod_01",
  "quantity": 120,
  "supplier_email": "supplier@soundgear.com"
}

// Response: 200 OK
{
  "purchase_order_id": "PO-2025-1102",
  "product_name": "Wireless Headphones",
  "units_ordered": 120,
  "total_cost": 5400.00,
  "status": "ORDER_PLACED",
  "estimated_delivery": "2025-11-16T00:00:00Z"
}
```
