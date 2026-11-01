# API_DATABASE_MAPPING.md
## API to Database Mapping Specification
### PayPal Merchant Growth Engine — REST Endpoints, Schema Contracts & Database Operations

---

## 1. Authentication & Identity Endpoints (`/api/v1/auth`)

| Endpoint | HTTP Method | Request Payload / Params | Response Schema | Database Tables Affected | Persistence Operations | Security / Authorization |
|---|---|---|---|---|---|---|
| `/auth/register` | `POST` | `UserRegister` (`email`, `password`, `full_name`) | `Token` (`access_token`, `user`) | `users`, `authentication_events` | Inserts new user with Argon2id/Bcrypt hash; logs `REGISTER_SUCCESS` | Public endpoint; rate-limited |
| `/auth/login` | `POST` | `UserLogin` (`email`, `password`) | `Token` (`access_token`, `user`) | `users`, `user_sessions`, `authentication_events` | Verifies hash, creates active session record, logs `LOGIN_SUCCESS` / `LOGIN_FAILED` | Public endpoint; rate-limited |
| `/auth/logout` | `POST` | Empty / Bearer Header | `{"message": "Logged out"}` | `user_sessions`, `authentication_events` | Marks session revoked; logs `LOGOUT` | Authenticated (`get_current_user`) |
| `/auth/me` | `GET` | Bearer Header | `UserResponse` | `users`, `merchant_members` | Queries user details and checks active merchant membership | Authenticated (`get_current_user`) |
| `/auth/change-password` | `POST` | `PasswordChange` (`current_password`, `new_password`) | `{"message": "Password updated"}` | `users`, `authentication_events` | Verifies current hash, updates to new secure hash, logs `PASSWORD_CHANGE` | Authenticated (`get_current_user`) |
| `/auth/forgot-password` | `POST` | `{"email": str}` | `{"message": "Reset instructions sent"}` | `password_reset_tokens`, `authentication_events` | Generates secure random token hash with 15-minute expiration | Public endpoint |
| `/auth/reset-password` | `POST` | `{"token": str, "new_password": str}` | `{"message": "Password reset successful"}` | `password_reset_tokens`, `users`, `authentication_events` | Validates single-use token, updates password hash, marks token used | Public endpoint |
| `/auth/google` | `POST` | `{"id_token": str}` | `Token` | `users`, `auth_identities`, `user_sessions` | Verifies Google token signature, links or resolves identity, issues JWT | Public endpoint |

---

## 2. Merchant Workspace Endpoints (`/api/v1/merchants`)

| Endpoint | HTTP Method | Request Payload / Params | Response Schema | Database Tables Affected | Persistence Operations | Security / Authorization |
|---|---|---|---|---|---|---|
| `/merchants/onboarding` | `POST` | `MerchantCreate` (`business_name`, `currency`, `category`, `country`, `description`) | `MerchantResponse` | `merchant_profiles`, `merchant_members`, `audit_logs` | Creates merchant record, assigns user as `OWNER`, records audit entry | Authenticated user |
| `/merchants/me` | `GET` | Header `X-Merchant-ID` | `MerchantResponse` | `merchant_profiles`, `merchant_members`, `paypal_connections` | Fetches active merchant details & PayPal connectivity status | Authenticated merchant member |
| `/merchants/me` | `PUT` | `MerchantUpdate` | `MerchantResponse` | `merchant_profiles`, `audit_logs` | Updates business name, currency, category, address | Requires `OWNER` or `ADMIN` role |
| `/merchants/my-merchants` | `GET` | Bearer Header | `List[MerchantResponse]` | `merchant_members`, `merchant_profiles` | Lists all merchant profiles the authenticated user belongs to | Authenticated user |

---

## 3. Product Catalog Endpoints (`/api/v1/products`)

| Endpoint | HTTP Method | Request Payload / Params | Response Schema | Database Tables Affected | Persistence Operations | Security / Authorization |
|---|---|---|---|---|---|---|
| `/products` | `GET` | Query `search`, `category`, `status_filter` | `List[ProductResponse]` | `products` | Queries active products filtered by merchant ID | Authenticated merchant member |
| `/products` | `POST` | `ProductCreate` | `ProductResponse` | `products`, `inventory_movements`, `audit_logs` | Inserts product; inserts `INITIAL` inventory movement ledger entry | Authenticated merchant member |
| `/products/{product_id}` | `GET` | Path `product_id` | `ProductResponse` | `products` | Reads specific product scoped strictly to merchant ID | Authenticated merchant member |
| `/products/{product_id}` | `PUT` | `ProductUpdate` | `ProductResponse` | `products`, `audit_logs` | Updates pricing, thresholds, or lead times | Authenticated merchant member |
| `/products/{product_id}` | `DELETE` | Path `product_id` | `{"message": "Archived"}` | `products`, `audit_logs` | Soft-deletes product (`is_active = False`) preserving historical integrity | Authenticated merchant member |
| `/products/import-csv` | `POST` | Multipart CSV File or JSON payload | `{"created": int, "updated": int}` | `products`, `inventory_movements` | Upserts product records matching on `(merchant_id, sku)` | Authenticated merchant member |

---

## 4. Sales History Endpoints (`/api/v1/sales`)

| Endpoint | HTTP Method | Request Payload / Params | Response Schema | Database Tables Affected | Persistence Operations | Security / Authorization |
|---|---|---|---|---|---|---|
| `/sales` / `/sales/daily` | `GET` | Query `product_id`, `limit` | `List[DailySaleResponse]` | `daily_sales`, `products` | Reads daily sales aggregates joined with product name and SKU | Authenticated merchant member |
| `/sales` / `/sales/daily` | `POST` | `DailySaleCreate` (`product_id`, `sales_date`, `units_sold`, `revenue`) | `DailySaleResponse` | `daily_sales`, `products`, `inventory_movements` | Upserts daily aggregate; decrements stock; logs `SALE` movement | Authenticated merchant member |
| `/sales/import-csv` | `POST` | Multipart CSV File | `{"imported_records": int}` | `daily_sales` | Batch inserts or updates daily sales time-series observations | Authenticated merchant member |

---

## 5. Inventory & Reordering Endpoints (`/api/v1/inventory`)

| Endpoint | HTTP Method | Request Payload / Params | Response Schema | Database Tables Affected | Persistence Operations | Security / Authorization |
|---|---|---|---|---|---|---|
| `/inventory/status` | `GET` | None | `{"summary": dict, "items": list}` | `products` | Calculates real-time stock status (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`) | Authenticated merchant member |
| `/inventory/adjust-stock` | `POST` | `StockAdjustment` (`product_id`, `adjustment_units`, `reason`) | `{"current_stock": int}` | `products`, `inventory_movements`, `audit_logs` | Adjusts stock count; appends immutable ledger entry | Authenticated merchant member |
| `/inventory/reorders` | `GET` | None | `List[ReorderRecommendationResponse]` | `products`, `daily_sales`, `reorder_recommendations` | Calculates deterministic ROP replenishment and returns pending alerts | Authenticated merchant member |
| `/inventory/purchase-orders` | `POST` | `PurchaseOrderCreate` (`product_id`, `quantity`, `supplier_name`) | `PurchaseOrderResponse` | `purchase_order_drafts`, `products` | Creates formal replenishment purchase order draft | Authenticated merchant member |
| `/inventory/purchase-orders` | `GET` | None | `List[PurchaseOrderResponse]` | `purchase_order_drafts`, `products` | Lists purchase orders ordered by creation date | Authenticated merchant member |
| `/inventory/purchase-orders/{po_id}/receive` | `POST` | Path `po_id` | `{"new_stock": int}` | `purchase_order_drafts`, `products`, `inventory_movements` | Marks PO `RECEIVED`, increments stock, appends `RESTOCK` movement | Authenticated merchant member |

---

## 6. Financial Ledger & Buyer Endpoints (`/api/v1/transactions`)

| Endpoint | HTTP Method | Request Payload / Params | Response Schema | Database Tables Affected | Persistence Operations | Security / Authorization |
|---|---|---|---|---|---|---|
| `/transactions` | `GET` | Query `type`, `search`, `limit` | `List[TransactionResponse]` | `transactions`, `customers` | Reads financial transaction feed with joined customer names | Authenticated merchant member |
| `/transactions/summary` | `GET` | None | `{"current_balance": float, ...}` | `transactions` | Calculates sum of received minus payouts and processor fees | Authenticated merchant member |
| `/transactions/customers` | `GET` | Query `limit`, `search` | `List[CustomerResponse]` | `customers` | Reads buyer profiles sorted by total spend descending | Authenticated merchant member |

---

## 7. PayPal Platform Endpoints (`/api/v1/paypal`)

| Endpoint | HTTP Method | Request Payload / Params | Response Schema | Database Tables Affected | Persistence Operations | Security / Authorization |
|---|---|---|---|---|---|---|
| `/paypal/status` | `GET` | None | `PayPalStatusResponse` | `paypal_connections` | Reads connection status and preview of configured Client ID | Authenticated merchant member |
| `/paypal/connect` | `POST` | `PayPalConnectRequest` | `PayPalStatusResponse` | `paypal_connections`, `audit_logs` | Symmetrically encrypts secret and persists merchant connection | Authenticated merchant member |
| `/paypal/simulate-sandbox-payment` | `POST` | `SimulatePaymentRequest` | `{"status": "COMPLETED", ...}` | `customers`, `orders`, `order_items`, `transactions`, `products`, `inventory_movements` | Atomic transaction: resolves customer, calculates fee, persists order, deducts stock, records transaction | Authenticated merchant member |
| `/paypal/webhooks` | `POST` | Raw PayPal webhook JSON | `{"received": True}` | `webhook_events` | Idempotent insertion ensuring event ID deduplication | PayPal platform callback |

---

## 8. Machine Learning & Analytics Endpoints (`/api/v1/analytics`)

| Endpoint | HTTP Method | Request Payload / Params | Response Schema | Database Tables Affected | Persistence Operations | Security / Authorization |
|---|---|---|---|---|---|---|
| `/analytics/overview` | `GET` | None | `OverviewResponse` | `transactions`, `products`, `customers`, `paypal_connections` | Computes live dashboard metrics (balance, 30d gross, growth %, counts) | Authenticated merchant member |
| `/analytics/rfm-segments` | `GET` | None | `{"status": str, "segments": list}` | `customers`, `customer_segments`, `customer_segment_assignments` | Executes K-Means clustering; persists segments and customer assignments | Authenticated merchant member |
| `/analytics/customer-locations` | `GET` | None | `List[LocationShare]` | `customers` | Aggregates geographic city distribution shares | Authenticated merchant member |
| `/analytics/category-shares` | `GET` | None | `List[CategoryShare]` | `products` | Aggregates product catalog category distribution | Authenticated merchant member |
| `/analytics/forecasts/{product_id}` | `GET` | Path `product_id` | `DemandForecastResponse` | `products`, `daily_sales`, `demand_forecasts`, `ml_models` | Fits Statsmodels Holt-Winters / Moving Average; persists 14d predictions | Authenticated merchant member |

---

## 9. Marketing & Agentic AI Endpoints (`/api/v1/marketing` & `/api/v1/agent`)

| Endpoint | HTTP Method | Request Payload / Params | Response Schema | Database Tables Affected | Persistence Operations | Security / Authorization |
|---|---|---|---|---|---|---|
| `/marketing/campaigns` | `GET` | None | `List[CampaignResponse]` | `marketing_campaigns` | Reads campaign drafts and active promotions | Authenticated merchant member |
| `/marketing/campaigns` | `POST` | `CampaignDraftCreate` | `CampaignResponse` | `marketing_campaigns`, `customers` | Calculates audience reach and persists campaign draft | Authenticated merchant member |
| `/marketing/campaigns/{id}/activate` | `PUT` | Path `campaign_id` | `CampaignResponse` | `marketing_campaigns` | Updates campaign status to `ACTIVE` | Authenticated merchant member |
| `/agent/chat` | `POST` | `AgentQueryRequest` | `AgentQueryResponse` | `agent_conversations`, `agent_messages`, `agent_tool_executions` | Orchestrates Gemini AI / controlled tools; saves messages & tool audit | Authenticated merchant member |
| `/settings/profile` | `GET` | None | `{"user": dict, "business": dict}` | `users`, `merchant_profiles` | Reads profile information for current session | Authenticated merchant member |
| `/settings/audit-logs` | `GET` | None | `List[dict]` | `audit_logs` | Reads 50 most recent immutable audit log entries | Authenticated merchant member |
| `/settings/export-data` | `GET` | None | Full JSON document | Dynamic multi-table query | Exports complete merchant data for GDPR compliance | Authenticated merchant member |
