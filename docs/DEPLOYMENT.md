# Production Deployment & Operations Guide

## 1. Prerequisites

- **Python**: 3.11 or higher
- **Node.js**: 18.0 or higher (with npm)
- **Database**: PostgreSQL 15+ (Production) or SQLite (Local / Dev)
- **PayPal Developer Account**: Access to `developer.paypal.com` Sandbox

---

## 2. Environment Configuration

Copy `.env.example` in `backend/` to `backend/.env` and configure credentials:

```bash
# Application Environment
APP_ENV=production
DEBUG=False
SECRET_KEY=generate_a_secure_random_64_char_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database Connection
# Production PostgreSQL:
DATABASE_URL=postgresql://postgres:password@localhost:5432/merchant_growth
# Local SQLite fallback:
# DATABASE_URL=sqlite:///./merchant_growth.db

# PayPal Developer Platform
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# Google Gemini AI Agent
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# CORS Allowed Origins
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","https://your-production-domain.com"]
```

---

## 3. Running Development Servers

### Terminal 1: Backend API Gateway
```bash
# From workspace root
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger UI will be accessible at: `http://127.0.0.1:8000/docs`

### Terminal 2: Frontend Single Page Application
```bash
cd frontend
npm install
npm run dev
```
Application dashboard will be accessible at: `http://localhost:5173`

---

## 4. Production Build & Static Assets

Compile production-ready minified JavaScript and CSS:

```bash
cd frontend
npm run build
```

The compiled assets in `frontend/dist/` can be served via Nginx, AWS S3 + CloudFront, or directly mounted as static files in FastAPI.
