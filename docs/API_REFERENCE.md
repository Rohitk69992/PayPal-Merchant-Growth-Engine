# REST API v1 Reference & Endpoint Specification

Base URL: `http://localhost:8000/api/v1`

All requests except `/auth/register` and `/auth/login` require:
- Header: `Authorization: Bearer <jwt_access_token>`
- Optional Header: `X-Merchant-ID: <merchant_uuid>` (defaults to primary merchant if omitted)

---

## 1. Authentication (`/auth`)

### `POST /auth/register`
Creates a new user account.
- **Request Body**:
  ```json
  {
    "email": "owner@example.com",
    "password": "SecurePassword123!",
    "full_name": "Elena Rostova"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": { "id": "uuid", "email": "owner@example.com", "full_name": "Elena Rostova", "is_active": true }
  }
  ```

### `POST /auth/login`
Authenticates user and issues access token.
- **Request Body**: `{ "email": "owner@example.com", "password": "SecurePassword123!" }`
- **Response** (`200 OK`): `{ "access_token": "...", "token_type": "bearer", "user": { ... } }`

---

## 2. Merchants (`/merchants`)

### `POST /merchants/onboarding`
Creates a new business workspace and assigns owner membership.
- **Request Body**:
  ```json
  {
    "business_name": "Apex Audio & Wearables",
    "currency": "USD",
    "category": "Electronics & Wearables",
    "address": "400 Enterprise Blvd",
    "phone": "+1 555-0199"
  }
  ```
- **Response** (`201 Created`): Returns `MerchantProfile`.

---

## 3. Product Catalog & Inventory (`/products`, `/inventory`)

### `GET /products/`
Lists all products for active merchant with optional filtering.
- **Query Params**: `category` (string), `search` (string)
- **Response** (`200 OK`): `List[ProductResponse]`

### `POST /products/`
Registers a new master product.
- **Request Body**:
  ```json
  {
    "sku": "WH-AUDIO-PRO",
    "name": "Wireless Noise-Canceling Headphones",
    "category": "Electronics",
    "unit_cost": 65.00,
    "selling_price": 149.99,
    "current_stock": 40,
    "safety_stock": 10,
    "lead_time_days": 7,
    "supplier_name": "SoundWave Electronics Ltd"
  }
  ```
- **Response** (`201 Created`): Returns created `ProductResponse`.

### `GET /inventory/reorders`
Calculates deterministic reorder recommendations across catalog.
- **Response** (`200 OK`): `List[ReorderRecommendationResponse]`

### `POST /inventory/purchase-orders`
Dispatches a supplier replenishment purchase order.
- **Request Body**: `{ "product_id": "uuid", "quantity": 50 }`
- **Response** (`201 Created`): Returns `PurchaseOrderResponse`.

---

## 4. Sales & Daily Demand (`/sales`)

### `POST /sales/`
Records daily product sales volume.
- **Request Body**:
  ```json
  {
    "product_id": "uuid",
    "sales_date": "2026-10-30",
    "units_sold": 25,
    "revenue": 3749.75,
    "channel": "PAYPAL_CHECKOUT"
  }
  ```
- **Response** (`201 Created`): Returns `DailySaleResponse`.

---

## 5. PayPal Developer Integration (`/paypal`)

### `GET /paypal/status`
Returns connection mode, environment, and encrypted preview.
- **Response** (`200 OK`): `PayPalStatusResponse`

### `POST /paypal/connect`
Configures Mode B merchant REST API credentials.
- **Request Body**: `{ "client_id": "...", "client_secret": "...", "environment": "sandbox" }`
- **Response** (`200 OK`): `PayPalStatusResponse`

### `POST /paypal/simulate-sandbox-payment`
Executes an end-to-end sandbox payment capture.
- **Request Body**:
  ```json
  {
    "amount": 149.99,
    "description": "Purchase of Wireless Headphones",
    "product_id": "uuid",
    "customer_email": "buyer@example.com",
    "customer_name": "Liam Vance"
  }
  ```
- **Response** (`200 OK`): Returns captured transaction and order details.

---

## 6. Analytics & Machine Learning (`/analytics`)

### `GET /analytics/overview`
Aggregated store balance, gross 30d sales, and product alerts.
- **Response** (`200 OK`): `OverviewResponse`

### `GET /analytics/rfm-segments`
Runs Scikit-learn K-Means customer segmentation.
- **Response** (`200 OK`):
  ```json
  {
    "status": "SUFFICIENT",
    "silhouette_score": 0.116,
    "total_customers": 5,
    "segments": [ ... ]
  }
  ```

### `GET /analytics/forecasts/{product_id}`
Fits Statsmodels Holt-Winters / Moving Average time-series model.
- **Response** (`200 OK`): `DemandForecastResponse`

---

## 7. Agentic AI Copilot (`/agent`)

### `POST /agent/chat`
Interacts with the Gemini AI Copilot with controlled backend tools.
- **Request Body**: `{ "message": "What should I reorder to avoid stockouts?" }`
- **Response** (`200 OK`):
  ```json
  {
    "conversation_id": "uuid",
    "reply": "Based on current stock levels...",
    "tool_executions": [
      { "tool_name": "get_inventory_status", "status": "SUCCESS" },
      { "tool_name": "calculate_reorder_recommendation", "status": "SUCCESS" }
    ]
  }
  ```
