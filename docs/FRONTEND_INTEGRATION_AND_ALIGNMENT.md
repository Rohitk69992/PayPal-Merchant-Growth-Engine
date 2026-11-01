# Frontend Integration and Alignment Guide

## 1. Overview
This document outlines the frontend-to-backend alignment for the **PayPal Merchant Growth Engine**, ensuring that every user interaction routes correctly to the PostgreSQL-backed API layer, respects clean-slate tenant data, and handles multi-merchant context seamlessly.

---

## 2. API Client Architecture (`frontend/src/services/apiClient.ts`)

### Base Configuration and Request Interceptor
The frontend API client routes all requests to `http://127.0.0.1:8000/api/v1` (configurable via `VITE_API_URL`). Every request automatically includes:
- `Content-Type: application/json`
- `Authorization: Bearer <token>`: Stateful JWT session token retrieved from `localStorage`.
- `X-Merchant-ID: <current_merchant_id>`: Active tenant context header retrieved from `localStorage`.

### Complete Endpoint Directory
| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/auth/register` | Register user with full name, email, password |
| **Auth** | `POST` | `/auth/login` | Login user, issues stateful session token |
| **Auth** | `POST` | `/auth/logout` | Revoke session in PostgreSQL `user_sessions` |
| **Auth** | `GET` | `/auth/me` | Fetch authenticated user profile & tenant status |
| **Merchant** | `POST` | `/merchants/onboarding` | Clean-slate onboarding; initializes settings & audit log |
| **Merchant** | `GET` | `/merchants/me` | Fetch active merchant profile |
| **Merchant** | `GET` | `/merchants/my-merchants` | Fetch all merchant workspaces user has membership in |
| **Products** | `GET` | `/products` | Filtered product catalog by search, category, status |
| **Products** | `POST` | `/products` | Create product with auto-initial stock ledger movement |
| **Products** | `PUT` | `/products/{id}` | Update product pricing, thresholds, and supplier info |
| **Products** | `DELETE` | `/products/{id}` | Archive product (`is_active = False`) |
| **Products** | `POST` | `/products/import-csv` | Bulk CSV import supporting JSON `{ csv_content }` & multipart file |
| **Sales** | `GET` | `/sales` | Retrieve daily sales history |
| **Sales** | `POST` | `/sales` | Record manual daily sale with stock depletion |
| **Sales** | `POST` | `/sales/import-csv` | Bulk CSV daily sales import |
| **Inventory** | `POST` | `/inventory/adjust` | Manual stock level adjustment with audit ledger reason |
| **Inventory** | `GET` | `/inventory/reorders` | Deterministic ROP replenishment recommendations |
| **Inventory** | `POST` | `/inventory/purchase-orders` | Draft replenishment purchase order |
| **Inventory** | `POST` | `/inventory/purchase-orders/{id}/receive` | Receive goods and increment stock on hand |
| **Transactions** | `GET` | `/transactions` | Filter transactions by type, status, or search query |
| **Transactions** | `GET` | `/transactions/customers` | List tracked customer profiles and purchase statistics |
| **PayPal** | `GET` | `/paypal/status` | Check sandbox credentials & webhook status |
| **PayPal** | `POST` | `/paypal/connect` | Store and verify PayPal API credentials |
| **PayPal** | `POST` | `/paypal/simulate-sandbox-payment` | Trigger live sandbox capture with stock depletion & customer record |
| **Analytics** | `GET` | `/analytics/overview` | Processed balance, transaction counts, and stock counts |
| **Analytics** | `GET` | `/analytics/rfm-segments` | Scikit-learn RFM customer clustering results |
| **Analytics** | `GET` | `/analytics/forecasts/{id}` | Statsmodels Holt-Winters 30-day demand forecast |
| **Marketing** | `GET` | `/marketing/campaigns` | List draft and active marketing campaigns |
| **Marketing** | `POST` | `/marketing/campaigns` | Create and target marketing promotional campaigns |
| **AI Agent** | `POST` | `/agent/chat` | Multi-turn conversational copilot with database tool execution |
| **Settings** | `GET` | `/settings/audit-logs` | Immutable audit trail of catalog and tenant mutations |
| **Settings** | `GET` | `/settings/export` | Complete GDPR JSON export of all merchant tenant records |

---

## 3. Key Alignment Solutions

### A. Backward-Compatible Property Normalization
PostgreSQL stores `selling_price` and `current_stock` using `NUMERIC` types, while frontend components historically used `unitPrice` and `stockOnHand`. The `apiClient` maps these safely:
```typescript
unitCost: Number(p.unit_cost ?? 0),
unitPrice: Number(p.selling_price ?? p.unit_price ?? 0),
stockOnHand: p.current_stock ?? p.stock_on_hand ?? 0,
reorderThreshold: p.safety_stock ?? p.reorder_point ?? 10,
safetyStock: Number(p.safety_stock ?? 10),
leadTimeDays: Number(p.lead_time_days ?? 7),
supplierName: p.supplier_name || 'Standard Supplier',
status: p.status || (stock <= 0 ? 'OUT_OF_STOCK' : stock <= reorder ? 'LOW_STOCK' : 'IN_STOCK'),
```

### B. Dual-Mode CSV Ingestion
The CSV import modals in `ProductsPage.tsx` and `SalesEntryPage.tsx` submit raw text via JSON `{ csv_content: string }`, while external scripts may upload `multipart/form-data`. The backend endpoints (`/products/import-csv` and `/sales/import-csv`) inspect the `Content-Type` header and seamlessly decode either payload format.

### C. Product Management Actions
`ProductsPage.tsx` incorporates dedicated Edit and Archive action buttons in every table row:
- **Edit Modal**: Allows updating product name, category, unit cost, retail price, safety stock, lead time days, and supplier name without altering historical stock movements.
- **Archive Action**: Soft-deletes products (`is_active = False`) and records an immutable `PRODUCT_ARCHIVED` audit log.

### D. Global AI Copilot Drawer Trigger
`AppLayout.tsx` provides an `Outlet` context `context={{ onOpenAiDrawer: () => setIsAiDrawerOpen(true) }}`. When a merchant clicks "Ask AI Copilot" on `HomeDashboard.tsx`, the AI drawer slides open smoothly and allows natural language querying against live database state.

---

## 4. Verification and Build Status
- **TypeScript & Vite Compilation**: Executed `npm run build` in `frontend/`:
  - 2,653 modules transformed
  - 0 type errors, 0 compilation warnings
  - Asset bundles generated: `index.html`, `index.css` (51.48 kB), `index.js` (786.22 kB)
- **Zero Mock Fallbacks**: Empty states display informative onboarding guidance instead of synthetic records.
