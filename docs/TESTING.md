# Testing Strategy & Quality Assurance

## 1. Test Architecture Overview

The platform uses a layered testing strategy to ensure 100% architectural and mathematical integrity:

```
┌────────────────────────────────────────────────────────┐
│     End-to-End Platform Verification Script             │
│     (scripts/verify_platform.py - 12 Lifecycle Steps)  │
├────────────────────────────────────────────────────────┤
│     Automated Integration Test Suite (Pytest)           │
│     - Auth & Security (test_auth.py)                   │
│     - Multi-Tenancy Isolation (test_multi_tenancy.py)  │
│     - Catalog & Sales Flow (test_products_sales.py)   │
│     - ML Pipelines & Fallbacks (test_ml_pipelines.py)  │
├────────────────────────────────────────────────────────┤
│     Frontend TypeScript & Vite Production Build Check   │
│     (npm run build - 0 TypeScript / Bundle Errors)     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Running Automated Tests

### 2.1 Backend Pytest Suite
Run the full pytest suite from the project root directory:

```bash
# Execute all backend tests with verbose output
python -m pytest backend/tests -v
```

Expected result:
```text
backend/tests/test_auth.py::test_user_registration_and_login PASSED
backend/tests/test_ml_pipelines.py::test_ml_pipeline_graceful_insufficient_data_and_execution PASSED
backend/tests/test_multi_tenancy.py::test_multi_tenant_isolation PASSED
backend/tests/test_products_sales.py::test_products_and_daily_sales_lifecycle PASSED
======================= 4 passed in 3.78s =======================
```

### 2.2 End-to-End Platform Verification Script
The comprehensive verification script tests the complete merchant lifecycle in sequence:

```bash
python scripts/verify_platform.py
```

Test sequence:
1. System Health Check
2. User Registration
3. Merchant Tenant Onboarding
4. Clean-Slate Baseline Verification
5. PayPal Sandbox Credentials Storage & Encryption
6. Product Catalog Creation & Low Stock Trigger
7. 7-Day Sales History Logging
8. Statsmodels Holt-Winters / Moving Average Forecast Generation
9. Live PayPal Sandbox Payment Captures (5 distinct customers)
10. Scikit-learn K-Means RFM Cohort Clustering
11. Agentic AI Copilot Tool Orchestration (`get_merchant_overview`, `calculate_reorder_recommendation`)
12. Cross-Tenant Multi-Tenancy Boundary Isolation Check

### 2.3 Frontend TypeScript Verification & Build
Ensure frontend types and build artifacts compile cleanly:

```bash
cd frontend
npm run build
```
