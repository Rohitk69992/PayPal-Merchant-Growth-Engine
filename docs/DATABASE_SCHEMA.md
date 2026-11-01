# DATABASE_SCHEMA.md
## Complete Relational Database Schema Specification
### PostgreSQL 18.4 — PayPal Merchant Growth Engine

---

## 1. Schema Summary

- **Total Tables**: 32
- **Dialect**: PostgreSQL 18
- **ORM**: SQLAlchemy 2.0
- **Primary Key Strategy**: UUID v4 (`String(36)`)
- **Monetary Types**: `Numeric(12, 2)` and `Numeric(10, 2)` (Strict financial decimal precision)
- **Timestamp Strategy**: UTC Timezone-Aware (`DateTime(timezone=True)`)

---

## 2. Table Catalog

### 2.1 Identity & Authentication

#### `users`
Represents platform user accounts.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `email` (VARCHAR(255), UNIQUE, NOT NULL, INDEX): Normalized lowercase user email address.
- `hashed_password` (VARCHAR(255), NOT NULL): Cryptographic hash (Bcrypt / Argon2id).
- `full_name` (VARCHAR(150), NOT NULL): User's legal name.
- `is_active` (BOOLEAN, DEFAULT TRUE, NOT NULL): Account activation flag.
- `is_verified` (BOOLEAN, DEFAULT FALSE, NOT NULL): Email verification status.
- `created_at` (TIMESTAMPTZ, NOT NULL): Registration timestamp.
- `updated_at` (TIMESTAMPTZ, NOT NULL): Last profile update.

#### `auth_identities`
Stores federated identity provider linkages (e.g. Google OAuth 2.0 / OpenID Connect).
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `user_id` (VARCHAR(36), FK -> `users.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `provider` (VARCHAR(50), NOT NULL): Identity provider (e.g., `'google'`).
- `provider_subject_id` (VARCHAR(255), NOT NULL, INDEX): Stable subject identifier from provider (`sub`).
- `email` (VARCHAR(255), NOT NULL): Verified email associated with the federated account.
- `created_at` (TIMESTAMPTZ, NOT NULL).
- **Constraints**: `UNIQUE(provider, provider_subject_id)`

#### `user_sessions`
Active session tracking and server-side revocation.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `user_id` (VARCHAR(36), FK -> `users.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `session_token` (VARCHAR(255), UNIQUE, NOT NULL, INDEX): High-entropy opaque session token or JWT identifier.
- `ip_address` (VARCHAR(45), NULL): Client IP address.
- `user_agent` (VARCHAR(255), NULL): Browser / client user-agent string.
- `expires_at` (TIMESTAMPTZ, NOT NULL): Session expiration timestamp.
- `is_revoked` (BOOLEAN, DEFAULT FALSE, NOT NULL): Set to TRUE on explicit logout.
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `password_reset_tokens`
Secure single-use tokens for password recovery.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `user_id` (VARCHAR(36), FK -> `users.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `token_hash` (VARCHAR(255), UNIQUE, NOT NULL, INDEX): SHA-256 hash of single-use reset token.
- `expires_at` (TIMESTAMPTZ, NOT NULL): Token expiration time (15-minute window).
- `is_used` (BOOLEAN, DEFAULT FALSE, NOT NULL): Set to TRUE upon successful reset.
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `email_verification_tokens`
Account email verification tokens.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `user_id` (VARCHAR(36), FK -> `users.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `token_hash` (VARCHAR(255), UNIQUE, NOT NULL, INDEX).
- `expires_at` (TIMESTAMPTZ, NOT NULL).
- `is_used` (BOOLEAN, DEFAULT FALSE, NOT NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `authentication_events`
Security and compliance audit trail for identity operations.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `user_id` (VARCHAR(36), FK -> `users.id` ON DELETE SET NULL, NULL, INDEX).
- `email_attempted` (VARCHAR(255), NOT NULL): Email submitted in authentication request.
- `event_type` (VARCHAR(50), NOT NULL, INDEX): `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `PASSWORD_CHANGE`, `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_COMPLETE`.
- `ip_address` (VARCHAR(45), NULL).
- `user_agent` (VARCHAR(255), NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).

---

### 2.2 Merchant Organization & Multi-Tenancy

#### `merchant_profiles`
The primary tenant entity representing a distinct merchant business.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `business_name` (VARCHAR(255), NOT NULL): Legal or operating store name.
- `business_category` (VARCHAR(100), DEFAULT `'General Retail'`, NOT NULL): Industry category.
- `country` (VARCHAR(3), DEFAULT `'USA'`, NOT NULL): ISO 3166-1 alpha-3 country code.
- `currency` (VARCHAR(3), DEFAULT `'USD'`, NOT NULL): ISO 4217 primary currency code (`USD`, `EUR`, `GBP`).
- `description` (TEXT, NULL): Business profile overview.
- `created_at` (TIMESTAMPTZ, NOT NULL).
- `updated_at` (TIMESTAMPTZ, NOT NULL).

#### `merchant_members`
Resolves user membership and roles within merchant profiles (Role-Based Access Control).
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `user_id` (VARCHAR(36), FK -> `users.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `role` (VARCHAR(50), DEFAULT `'OWNER'`, NOT NULL): Role identifier (`OWNER`, `ADMIN`, `ANALYST`, `VIEWER`).
- `created_at` (TIMESTAMPTZ, NOT NULL).
- **Constraints**: `UNIQUE(merchant_id, user_id)`

#### `merchant_settings`
Merchant-specific operational preferences and threshold configurations.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, UNIQUE, NOT NULL, INDEX).
- `auto_reorder_enabled` (BOOLEAN, DEFAULT FALSE, NOT NULL).
- `default_safety_stock` (INT, DEFAULT 10, NOT NULL).
- `default_lead_time_days` (INT, DEFAULT 7, NOT NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).
- `updated_at` (TIMESTAMPTZ, NOT NULL).

---

### 2.3 Product Catalog & Inventory

#### `products`
Product master records.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `sku` (VARCHAR(64), NOT NULL): Stock keeping unit.
- `name` (VARCHAR(255), NOT NULL): Product display name.
- `category` (VARCHAR(100), DEFAULT `'General'`, NOT NULL): Catalog category.
- `unit_cost` (NUMERIC(10, 2), DEFAULT 0.00, NOT NULL): Cost of goods.
- `selling_price` (NUMERIC(10, 2), NOT NULL): Retail selling price.
- `current_stock` (INT, DEFAULT 0, NOT NULL): Live inventory count.
- `safety_stock` (INT, DEFAULT 10, NOT NULL): Minimum safety buffer.
- `lead_time_days` (INT, DEFAULT 7, NOT NULL): Supplier replenishment lead time in days.
- `supplier_name` (VARCHAR(255), DEFAULT `'Direct Supplier'`, NOT NULL).
- `is_active` (BOOLEAN, DEFAULT TRUE, NOT NULL): Soft-deletion flag.
- `created_at` (TIMESTAMPTZ, NOT NULL).
- `updated_at` (TIMESTAMPTZ, NOT NULL).
- **Constraints**: `UNIQUE(merchant_id, sku)`

#### `inventory_movements`
Immutable append-only ledger tracking every stock change.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `product_id` (VARCHAR(36), FK -> `products.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `movement_type` (VARCHAR(50), NOT NULL): `INITIAL`, `SALE`, `RESTOCK`, `ADJUSTMENT`, `RETURN`.
- `quantity` (INT, NOT NULL): Delta units (positive for restock, negative for sales).
- `stock_after` (INT, NOT NULL): Verified stock balance immediately after mutation.
- `reason` (VARCHAR(255), NULL): Explanation or reference.
- `reference_id` (VARCHAR(100), NULL): Linked Order or PO ID.
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `daily_sales`
Aggregated daily product-level sales observations for time-series forecasting.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `product_id` (VARCHAR(36), FK -> `products.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `sales_date` (VARCHAR(10), NOT NULL, INDEX): ISO format `YYYY-MM-DD`.
- `units_sold` (INT, DEFAULT 0, NOT NULL): Daily units sold count.
- `revenue` (NUMERIC(12, 2), DEFAULT 0.00, NOT NULL): Gross daily revenue for item.
- `channel` (VARCHAR(50), DEFAULT `'PAYPAL_CHECKOUT'`, NOT NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).
- **Constraints**: `UNIQUE(merchant_id, product_id, sales_date)`

#### `reorder_recommendations`
Actionable replenishment recommendations generated by deterministic ROP calculations.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `product_id` (VARCHAR(36), FK -> `products.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `recommended_quantity` (INT, NOT NULL): Recommended reorder batch size.
- `reasoning` (TEXT, NOT NULL): Statistical rationale and demand factors.
- `urgency` (VARCHAR(20), DEFAULT `'MEDIUM'`, NOT NULL): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `status` (VARCHAR(30), DEFAULT `'PENDING'`, NOT NULL): `PENDING`, `ORDERED`, `DISMISSED`.
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `purchase_order_drafts`
Formal procurement purchase orders.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `product_id` (VARCHAR(36), FK -> `products.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `quantity` (INT, NOT NULL): Units to procure.
- `unit_cost` (NUMERIC(10, 2), NOT NULL): Quoted supplier cost per unit.
- `total_amount` (NUMERIC(12, 2), NOT NULL): Total PO cost (`quantity * unit_cost`).
- `supplier_name` (VARCHAR(255), NOT NULL): Supplier company.
- `status` (VARCHAR(30), DEFAULT `'DRAFT'`, NOT NULL): `DRAFT`, `SUBMITTED`, `RECEIVED`, `CANCELLED`.
- `created_at` (TIMESTAMPTZ, NOT NULL).
- `received_at` (TIMESTAMPTZ, NULL): Timestamp when goods were accepted into stock.

---

### 2.4 Customers, Orders & Transactions

#### `customers`
Profiles of customer accounts purchasing from the merchant.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `paypal_payer_id` (VARCHAR(64), NULL): PayPal payer ID if available.
- `email` (VARCHAR(255), NOT NULL): Customer contact email.
- `first_name` (VARCHAR(100), NULL).
- `last_name` (VARCHAR(100), NULL).
- `city` (VARCHAR(100), DEFAULT `'Unknown'`, NOT NULL).
- `country` (VARCHAR(3), DEFAULT `'USA'`, NOT NULL).
- `total_spend` (NUMERIC(12, 2), DEFAULT 0.00, NOT NULL): Cumulative spend.
- `order_count` (INT, DEFAULT 0, NOT NULL): Cumulative completed orders.
- `first_purchase_at` (TIMESTAMPTZ, NULL).
- `last_purchase_at` (TIMESTAMPTZ, NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).
- `updated_at` (TIMESTAMPTZ, NOT NULL).
- **Constraints**: `UNIQUE(merchant_id, email)`

#### `orders`
Buyer purchase orders.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `customer_id` (VARCHAR(36), FK -> `customers.id` ON DELETE SET NULL, NULL, INDEX).
- `paypal_order_id` (VARCHAR(64), NULL, INDEX): External PayPal order ID.
- `gross_amount` (NUMERIC(12, 2), NOT NULL): Total order gross amount.
- `fee_amount` (NUMERIC(12, 2), DEFAULT 0.00, NOT NULL): Payment processor fees.
- `net_amount` (NUMERIC(12, 2), NOT NULL): Merchant net deposit (`gross - fee`).
- `currency` (VARCHAR(3), DEFAULT `'USD'`, NOT NULL).
- `status` (VARCHAR(50), DEFAULT `'CREATED'`, NOT NULL): `CREATED`, `APPROVED`, `COMPLETED`, `REFUNDED`.
- `order_date` (TIMESTAMPTZ, NOT NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `order_items`
Individual line items attached to orders.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `order_id` (VARCHAR(36), FK -> `orders.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `product_id` (VARCHAR(36), FK -> `products.id` ON DELETE SET NULL, NULL, INDEX).
- `sku` (VARCHAR(64), NOT NULL): SKU snapshot at time of purchase.
- `product_name` (VARCHAR(255), NOT NULL): Name snapshot at time of purchase.
- `quantity` (INT, DEFAULT 1, NOT NULL): Units purchased.
- `unit_price` (NUMERIC(10, 2), NOT NULL): Price per unit at purchase.
- `total_price` (NUMERIC(10, 2), NOT NULL): Line total (`quantity * unit_price`).

#### `transactions`
Immutable financial ledger records.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `order_id` (VARCHAR(36), FK -> `orders.id` ON DELETE SET NULL, NULL, INDEX).
- `customer_id` (VARCHAR(36), FK -> `customers.id` ON DELETE SET NULL, NULL, INDEX).
- `paypal_transaction_id` (VARCHAR(64), NULL, INDEX): PayPal capture ID.
- `type` (VARCHAR(30), DEFAULT `'PAYMENT'`, NOT NULL): `RECEIVED`, `PAYMENT`, `REFUND`.
- `gross_amount` (NUMERIC(12, 2), NOT NULL): Financial gross amount.
- `fee_amount` (NUMERIC(12, 2), DEFAULT 0.00, NOT NULL): Payment processor fee.
- `net_amount` (NUMERIC(12, 2), NOT NULL): Net settlement amount.
- `currency` (VARCHAR(3), DEFAULT `'USD'`, NOT NULL).
- `status` (VARCHAR(50), DEFAULT `'COMPLETED'`, NOT NULL): `COMPLETED`, `PENDING`, `REFUNDED`, `DISPUTED`.
- `payment_source` (VARCHAR(50), DEFAULT `'PAYPAL_CHECKOUT'`, NOT NULL): `PAYPAL_CHECKOUT`, `PAYPAL_WALLET`, `CARD`.
- `transaction_date` (TIMESTAMPTZ, NOT NULL).
- `title` (VARCHAR(255), NOT NULL): Ledger entry description.
- `category` (VARCHAR(100), DEFAULT `'Sales Revenue'`, NOT NULL).
- `notes` (TEXT, NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).

---

### 2.5 PayPal Integration

#### `paypal_connections`
Credentials and synchronization status for PayPal Developer Platform.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, UNIQUE, NOT NULL, INDEX).
- `environment` (VARCHAR(20), DEFAULT `'sandbox'`, NOT NULL): `sandbox` or `live`.
- `client_id` (VARCHAR(255), NOT NULL): PayPal REST Client ID.
- `encrypted_client_secret` (TEXT, NOT NULL): Symmetric cipher text of client secret.
- `webhook_id` (VARCHAR(100), NULL): Configured PayPal webhook identifier.
- `is_connected` (BOOLEAN, DEFAULT FALSE, NOT NULL).
- `last_sync_at` (TIMESTAMPTZ, NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).
- `updated_at` (TIMESTAMPTZ, NOT NULL).

#### `webhook_events`
Idempotent incoming webhook log.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `event_id` (VARCHAR(100), UNIQUE, NOT NULL, INDEX): PayPal event ID (deduplication key).
- `event_type` (VARCHAR(100), NOT NULL, INDEX): e.g., `CHECKOUT.ORDER.COMPLETED`.
- `resource_type` (VARCHAR(100), NOT NULL).
- `summary` (TEXT, NULL).
- `raw_payload` (TEXT, NOT NULL): Exact webhook JSON.
- `status` (VARCHAR(50), DEFAULT `'RECEIVED'`, NOT NULL): `RECEIVED`, `PROCESSED`, `FAILED`, `DUPLICATE`.
- `processed_at` (TIMESTAMPTZ, NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `paypal_sync_jobs`
Status of background transaction synchronization jobs.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `status` (VARCHAR(50), DEFAULT `'PENDING'`, NOT NULL): `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`.
- `records_synced` (INT, DEFAULT 0, NOT NULL).
- `error_message` (TEXT, NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).
- `completed_at` (TIMESTAMPTZ, NULL).

---

### 2.6 Analytics, Machine Learning & Marketing

#### `customer_segments`
Cohorts derived from Scikit-Learn K-Means RFM clustering.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `name` (VARCHAR(100), NOT NULL): Segment label (`VIP Customers`, `Loyal Shoppers`, etc.).
- `description` (TEXT, NULL).
- `customer_count` (INT, DEFAULT 0, NOT NULL).
- `percentage` (NUMERIC(5, 2), DEFAULT 0.00, NOT NULL): Percentage of customer base.
- `avg_spend` (NUMERIC(12, 2), DEFAULT 0.00, NOT NULL).
- `avg_recency_days` (INT, DEFAULT 0, NOT NULL).
- `color` (VARCHAR(20), DEFAULT `'#3B82F6'`, NOT NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).
- `updated_at` (TIMESTAMPTZ, NOT NULL).
- **Constraints**: `UNIQUE(merchant_id, name)`

#### `customer_segment_assignments`
Maps each customer to their active RFM cluster.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `customer_id` (VARCHAR(36), FK -> `customers.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `segment_id` (VARCHAR(36), FK -> `customer_segments.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `recency_days` (INT, NOT NULL).
- `frequency_count` (INT, NOT NULL).
- `monetary_total` (NUMERIC(12, 2), NOT NULL).
- `r_score` (INT, DEFAULT 1, NOT NULL).
- `f_score` (INT, DEFAULT 1, NOT NULL).
- `m_score` (INT, DEFAULT 1, NOT NULL).
- `assigned_at` (TIMESTAMPTZ, NOT NULL).
- **Constraints**: `UNIQUE(merchant_id, customer_id)`

#### `demand_forecasts`
Cached daily product demand predictions generated by Statsmodels Holt-Winters / Moving Average.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `product_id` (VARCHAR(36), FK -> `products.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `forecast_date` (VARCHAR(10), NOT NULL, INDEX): `YYYY-MM-DD`.
- `predicted_units` (NUMERIC(10, 2), NOT NULL): Expected demand.
- `lower_bound` (NUMERIC(10, 2), NOT NULL): 95% confidence lower bound.
- `upper_bound` (NUMERIC(10, 2), NOT NULL): 95% confidence upper bound.
- `model_type` (VARCHAR(50), DEFAULT `'HOLT_WINTERS'`, NOT NULL).
- `confidence_score` (FLOAT, DEFAULT 0.95, NOT NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).
- **Constraints**: `UNIQUE(merchant_id, product_id, forecast_date)`

#### `ml_models`
Model metadata registry.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `model_name` (VARCHAR(100), NOT NULL).
- `version` (VARCHAR(50), DEFAULT `'1.0.0'`, NOT NULL).
- `algorithm` (VARCHAR(100), NOT NULL).
- `description` (TEXT, NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `ml_training_runs`
Model training runs, dataset windows, and evaluation metrics audit.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `model_id` (VARCHAR(36), FK -> `ml_models.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `status` (VARCHAR(30), DEFAULT `'COMPLETED'`, NOT NULL).
- `dataset_start_date` (VARCHAR(10), NULL).
- `dataset_end_date` (VARCHAR(10), NULL).
- `data_points_count` (INT, DEFAULT 0, NOT NULL).
- `metrics_json` (TEXT, NULL): JSON string of metrics (MAE, RMSE, silhouette_score).
- `parameters_json` (TEXT, NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).
- `completed_at` (TIMESTAMPTZ, NULL).

#### `marketing_campaigns`
Promotional campaigns targeted to customer segments.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `target_segment` (VARCHAR(100), NOT NULL).
- `headline` (VARCHAR(255), NOT NULL).
- `email_subject` (VARCHAR(255), NOT NULL).
- `body_copy` (TEXT, NOT NULL).
- `discount_code` (VARCHAR(64), NOT NULL).
- `discount_pct` (NUMERIC(5, 2), DEFAULT 0.00, NOT NULL).
- `estimated_reach` (INT, DEFAULT 0, NOT NULL).
- `expected_conversion_rate` (NUMERIC(5, 2), DEFAULT 0.00, NOT NULL).
- `status` (VARCHAR(30), DEFAULT `'DRAFT'`, NOT NULL): `DRAFT`, `SCHEDULED`, `ACTIVE`, `COMPLETED`.
- `created_at` (TIMESTAMPTZ, NOT NULL).

---

### 2.7 AI Copilot & System Audit

#### `agent_conversations`
Persistent AI assistant chat sessions.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `title` (VARCHAR(255), DEFAULT `'Merchant Strategy Session'`, NOT NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `agent_messages`
Individual user and agent messages within conversations.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `conversation_id` (VARCHAR(36), FK -> `agent_conversations.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `sender` (VARCHAR(20), NOT NULL): `'user'` or `'agent'`.
- `message_text` (TEXT, NOT NULL).
- `tool_calls_json` (TEXT, NULL): Serialized JSON array of invoked tools.
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `agent_tool_executions`
Audit ledger of controlled backend tools invoked by the AI Copilot.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `conversation_id` (VARCHAR(36), NULL).
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `tool_name` (VARCHAR(100), NOT NULL).
- `input_params_json` (TEXT, NULL).
- `result_json` (TEXT, NULL).
- `status` (VARCHAR(20), DEFAULT `'SUCCESS'`, NOT NULL): `'SUCCESS'` or `'ERROR'`.
- `execution_time_ms` (INT, DEFAULT 0, NOT NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).

#### `audit_logs`
Immutable compliance and administrative action ledger.
- `id` (VARCHAR(36), PK): UUID v4 identifier.
- `merchant_id` (VARCHAR(36), FK -> `merchant_profiles.id` ON DELETE CASCADE, NOT NULL, INDEX).
- `user_id` (VARCHAR(36), FK -> `users.id` ON DELETE SET NULL, NULL, INDEX).
- `action` (VARCHAR(100), NOT NULL): Operational verb (e.g., `CREATE_PRODUCT`, `ADJUST_STOCK`).
- `resource_type` (VARCHAR(50), NOT NULL).
- `resource_id` (VARCHAR(100), NULL).
- `details_json` (TEXT, NULL).
- `ip_address` (VARCHAR(45), NULL).
- `created_at` (TIMESTAMPTZ, NOT NULL).
