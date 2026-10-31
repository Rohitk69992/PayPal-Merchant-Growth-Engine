from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_merchant
from backend.app.models.user import MerchantProfile
from backend.app.models.transaction import Transaction, Customer
from backend.app.models.inventory import Product
from backend.app.models.paypal import PayPalConnection
from backend.app.schemas.analytics import OverviewResponse, DemandForecastResponse
from backend.app.ml.rfm import calculate_rfm_segments
from backend.app.ml.forecasting import generate_product_forecast

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=OverviewResponse)
def get_analytics_overview(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    # Total balance = sum of received net amount minus payments
    total_received = db.query(func.coalesce(func.sum(Transaction.net_amount), 0.0)).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.status == "COMPLETED",
        Transaction.type == "RECEIVED"
    ).scalar()

    total_payments = db.query(func.coalesce(func.sum(Transaction.gross_amount), 0.0)).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.status == "COMPLETED",
        Transaction.type == "PAYMENT"
    ).scalar()

    current_balance = round(float(total_received) - float(total_payments), 2)

    # 30-day gross sales
    sales_30d = db.query(func.coalesce(func.sum(Transaction.gross_amount), 0.0)).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.status == "COMPLETED",
        Transaction.type == "RECEIVED",
        Transaction.transaction_date >= thirty_days_ago
    ).scalar()

    # Prior 30-day sales for genuine growth rate calculation
    sales_prior_30d = db.query(func.coalesce(func.sum(Transaction.gross_amount), 0.0)).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.status == "COMPLETED",
        Transaction.type == "RECEIVED",
        Transaction.transaction_date >= sixty_days_ago,
        Transaction.transaction_date < thirty_days_ago
    ).scalar()

    if float(sales_prior_30d) > 0:
        growth_rate = round(((float(sales_30d) - float(sales_prior_30d)) / float(sales_prior_30d)) * 100.0, 1)
    else:
        growth_rate = 0.0

    tx_count = db.query(Transaction).filter(Transaction.merchant_id == current_merchant.id).count()

    active_products = db.query(Product).filter(
        Product.merchant_id == current_merchant.id,
        Product.is_active == True
    ).count()

    low_stock_count = db.query(Product).filter(
        Product.merchant_id == current_merchant.id,
        Product.is_active == True,
        Product.current_stock <= Product.safety_stock
    ).count()

    customer_count = db.query(Customer).filter(Customer.merchant_id == current_merchant.id).count()

    paypal_conn = db.query(PayPalConnection).filter(PayPalConnection.merchant_id == current_merchant.id).first()
    is_paypal_connected = bool(paypal_conn and paypal_conn.is_connected)

    account_status = "All systems secure" if is_paypal_connected else "Connect PayPal to activate live rail"

    return OverviewResponse(
        total_balance=current_balance,
        gross_sales_30d=round(float(sales_30d), 2),
        growth_rate_pct=growth_rate,
        transaction_count=tx_count,
        active_products=active_products,
        customer_count=customer_count,
        low_stock_count=low_stock_count,
        paypal_connected=is_paypal_connected,
        account_status=account_status,
        currency=current_merchant.currency
    )

@router.get("/rfm-segments")
def get_rfm_segments(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Executes real Scikit-learn K-Means customer segmentation.
    Returns insufficient-data state when fewer than 4 customer records exist.
    """
    return calculate_rfm_segments(current_merchant.id, db)

@router.get("/customer-locations")
def get_customer_locations(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    customers = db.query(Customer).filter(Customer.merchant_id == current_merchant.id).all()
    if not customers:
        return []

    city_counts = {}
    for c in customers:
        city = c.city or "Unknown"
        city_counts[city] = city_counts.get(city, 0) + 1

    total = len(customers)
    results = [
        {"city": city, "percentage": round((cnt / total) * 100.0, 1)}
        for city, cnt in sorted(city_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    return results

@router.get("/category-shares")
def get_category_shares(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    products = db.query(Product).filter(
        Product.merchant_id == current_merchant.id,
        Product.is_active == True
    ).all()

    if not products:
        return []

    cat_counts = {}
    for p in products:
        cat = p.category or "General"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    total = len(products)
    return [
        {"category": cat, "percentage": round((cnt / total) * 100.0, 1)}
        for cat, cnt in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:4]
    ]

@router.get("/forecasts/{product_id}", response_model=DemandForecastResponse)
def get_product_forecast(
    product_id: str,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    res = generate_product_forecast(current_merchant.id, product_id, db)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=404, detail=res.get("message", "Product not found."))

    points = res.get("points", [])
    status_val = res.get("status", "INSUFFICIENT_DATA")
    method_val = res.get("model_type", "None")
    rec_units = res.get("recommended_units_next_period") or res.get("reorder_recommendation_units")
    rationale_val = res.get("rationale") or res.get("message")
    data_points = res.get("data_points_used", len(points))

    return DemandForecastResponse(
        product_id=res["product_id"],
        product_name=res["product_name"],
        sku=res["sku"],
        model_type=method_val,
        confidence_score=res.get("confidence_score", 0.0),
        historical_daily_average=res.get("historical_daily_average", 0.0),
        projected_growth_pct=res.get("projected_growth_pct", 0.0),
        points=points,
        data_sufficiency_status=status_val,
        message=res.get("message", ""),
        reorder_recommendation_units=rec_units,
        status=status_val,
        method=method_val,
        growth_rate_pct=res.get("projected_growth_pct", 0.0),
        recommended_units_next_period=rec_units,
        data_points_used=data_points,
        rationale=rationale_val
    )
