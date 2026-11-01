import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.core.database import engine
import backend.app.models  # Ensures all models are registered

# Import API Routers
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.merchants import router as merchants_router
from backend.app.api.v1.products import router as products_router
from backend.app.api.v1.sales import router as sales_router
from backend.app.api.v1.inventory import router as inventory_router
from backend.app.api.v1.transactions import router as transactions_router
from backend.app.api.v1.paypal import router as paypal_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.marketing import router as marketing_router
from backend.app.api.v1.agent import router as agent_router
from backend.app.api.v1.settings import router as settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify database connectivity and schema readiness on startup
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        print(f"Warning: Database startup connectivity check: {e}")
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent fintech & growth platform powered by the PayPal Developer Platform, ML and Gemini AI.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
api_prefix = "/api/v1"
app.include_router(auth_router, prefix=api_prefix)
app.include_router(merchants_router, prefix=api_prefix)
app.include_router(products_router, prefix=api_prefix)
app.include_router(sales_router, prefix=api_prefix)
app.include_router(inventory_router, prefix=api_prefix)
app.include_router(transactions_router, prefix=api_prefix)
app.include_router(paypal_router, prefix=api_prefix)
app.include_router(analytics_router, prefix=api_prefix)
app.include_router(marketing_router, prefix=api_prefix)
app.include_router(agent_router, prefix=api_prefix)
app.include_router(settings_router, prefix=api_prefix)

@app.get("/health")
def health_check():
    db_status = "CONNECTED"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"ERROR: {str(e)}"

    return {
        "status": "HEALTHY" if db_status == "CONNECTED" else "UNHEALTHY",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": db_status
    }

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "docs_url": "/docs"
    }
