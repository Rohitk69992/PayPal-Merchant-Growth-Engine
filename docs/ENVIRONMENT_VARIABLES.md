# ENVIRONMENT_VARIABLES.md
## Environment Variables & Configuration Reference
### PayPal Merchant Growth Engine

---

## 1. Overview

The **PayPal Merchant Growth Engine** uses `pydantic-settings` to load typed, validated environment variables from `.env` or system environment variables. 

All sensitive secrets (database passwords, API keys, JWT secrets) must remain in local uncommitted `.env` files and must NEVER be committed to version control.

---

## 2. Variables Specification

| Variable | Type | Default Value | Required | Description |
|---|---|---|---|---|
| `APP_NAME` | `str` | `"PayPal Merchant Growth Engine"` | No | Human-readable application title |
| `APP_ENV` | `str` | `"development"` | No | Operational environment (`development`, `staging`, `production`) |
| `DEBUG` | `bool` | `True` | No | Enables debug logging and interactive documentation (`/docs`) |
| `PORT` | `int` | `8000` | No | Port on which FastAPI uvicorn server listens |
| `SECRET_KEY` | `str` | *Required in production* | **Yes** | Cryptographic key (min 32 chars) for signing JWT access tokens and symmetric secret encryption |
| `ALGORITHM` | `str` | `"HS256"` | No | JWT signature algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `int` | `1440` (24h) | No | JWT validity duration before re-authentication is required |
| `DATABASE_URL` | `str` | `postgresql://...` | **Yes** | SQLAlchemy connection string to PostgreSQL (`postgresql://user:pass@host:port/dbname`) |
| `DB_POOL_SIZE` | `int` | `10` | No | Maximum persistent connections held in the connection pool |
| `DB_MAX_OVERFLOW` | `int` | `20` | No | Extra connections allowed during concurrency bursts |
| `DB_POOL_TIMEOUT` | `int` | `30` | No | Seconds to wait before raising a pool timeout exception |
| `DB_POOL_RECYCLE` | `int` | `1800` | No | Seconds before connection handles are recycled (prevents stale TCP connections) |
| `CORS_ORIGINS` | `List[str]` | `["http://localhost:5173", ...]` | No | JSON list of trusted web origins allowed to make cross-origin requests |
| `GOOGLE_CLIENT_ID` | `str` | `""` | Optional | Google Cloud OAuth 2.0 Web Client ID for Google Sign-In |
| `GOOGLE_CLIENT_SECRET` | `str` | `""` | Optional | Google Cloud OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | `str` | `http://localhost:5173/auth/google/callback` | Optional | OAuth redirect callback URI configured in Google Cloud Console |
| `PAYPAL_ENVIRONMENT` | `str` | `"sandbox"` | No | PayPal Developer Platform mode (`sandbox` or `live`) |
| `PAYPAL_CLIENT_ID` | `str` | `""` | Optional | PayPal Team Sandbox Client ID (Mode A platform fallback) |
| `PAYPAL_CLIENT_SECRET` | `str` | `""` | Optional | PayPal Team Sandbox Secret |
| `PAYPAL_WEBHOOK_ID` | `str` | `""` | Optional | PayPal Developer Dashboard Webhook ID for signature verification |
| `GEMINI_API_KEY` | `str` | `""` | Optional | Google Gemini API Key for natural language AI Copilot reasoning |
| `GEMINI_MODEL` | `str` | `"gemini-1.5-flash"` | No | Gemini model name used for agent orchestration |

---

## 3. Example `.env` (Local Development)

```bash
# Application
APP_NAME="PayPal Merchant Growth Engine"
APP_ENV=development
DEBUG=True
PORT=8000
SECRET_KEY=paypal_merchant_growth_engine_super_secret_jwt_key_2026_production_ready
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# PostgreSQL
DATABASE_URL=postgresql://paypal_app:PaypalApp2026Secure!@localhost:5432/paypal_growth_engine
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800

# CORS
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000"]

# Google OAuth 2.0 (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# PayPal Developer Platform
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=

# Gemini AI
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
```
