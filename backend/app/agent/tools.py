from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone

from backend.app.models.user import MerchantProfile
from backend.app.models.transaction import Transaction, Customer, Order
from backend.app.models.inventory import Product, DailySale
from backend.app.models.paypal import PayPalConnection
from backend.app.models.analytics import CustomerSegment
from backend.app.ml.inventory_math import calculate_inventory_reorder
from backend.app.ml.rfm import calculate_rfm_segments

def tool_get_merchant_overview(merchant_id: str, db: Session) -> Dict[str, Any]:
    merchant = db.query(MerchantProfile).filter(MerchantProfile.id == merchant_id).first()
    if not merchant:
        return {"error": "Merchant not found"}

    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Gross revenue
    gross_sales = db.query(func.coalesce(func.sum(Transaction.gross_amount), 0.0)).filter(
        Transaction.merchant_id == merchant_id,
        Transaction.status == "COMPLETED",
        Transaction.type.in_(["RECEIVED", "PAYMENT"])
    ).scalar()

    tx_count = db.query(Transaction).filter(
        Transaction.merchant_id == merchant_id,
        Transaction.status == "COMPLETED"
    ).count()

    product_count = db.query(Product).filter(
        Product.merchant_id == merchant_id,
        Product.is_active == True
    ).count()

    customer_count = db.query(Customer).filter(Customer.merchant_id == merchant_id).count()

    paypal_conn = db.query(PayPalConnection).filter(PayPalConnection.merchant_id == merchant_id).first()

    return {
        "business_name": merchant.business_name,
        "currency": merchant.currency,
        "total_revenue": round(float(gross_sales), 2),
        "completed_transactions": tx_count,
        "active_catalog_products": product_count,
        "tracked_customers": customer_count,
        "paypal_connected": bool(paypal_conn and paypal_conn.is_connected)
    }

def tool_get_inventory_status(merchant_id: str, db: Session) -> Dict[str, Any]:
    products = db.query(Product).filter(Product.merchant_id == merchant_id, Product.is_active == True).all()
    if not products:
        return {"status": "EMPTY", "message": "No products cataloged yet.", "items": []}

    items = []
    low_stock_count = 0
    for p in products:
        status_label = "OUT_OF_STOCK" if p.current_stock <= 0 else "LOW_STOCK" if p.current_stock <= p.safety_stock else "IN_STOCK"
        if status_label in ["OUT_OF_STOCK", "LOW_STOCK"]:
            low_stock_count += 1
        items.append({
            "product_id": p.id,
            "sku": p.sku,
            "name": p.name,
            "current_stock": p.current_stock,
            "safety_stock": p.safety_stock,
            "lead_time_days": p.lead_time_days,
            "unit_cost": p.unit_cost,
            "status": status_label
        })

    return {
        "total_products": len(products),
        "low_stock_alerts": low_stock_count,
        "items": items
    }

def tool_calculate_reorder(merchant_id: str, product_id: str, db: Session) -> Dict[str, Any]:
    return calculate_inventory_reorder(merchant_id, product_id, db)

def tool_get_customer_segments(merchant_id: str, db: Session) -> Dict[str, Any]:
    segments = db.query(CustomerSegment).filter(CustomerSegment.merchant_id == merchant_id).all()
    if not segments:
        # Compute live
        return calculate_rfm_segments(merchant_id, db)

    return {
        "status": "SUFFICIENT",
        "segments": [
            {
                "name": s.name,
                "customer_count": s.customer_count,
                "percentage": s.percentage,
                "avg_spend": s.avg_spend,
                "avg_recency_days": s.avg_recency_days
            } for s in segments
        ]
    }

def tool_generate_campaign_draft(merchant_id: str, target_segment: str, db: Session) -> Dict[str, Any]:
    merchant = db.query(MerchantProfile).filter(MerchantProfile.id == merchant_id).first()
    business_name = merchant.business_name if merchant else "our store"

    discount_code = f"{target_segment[:4].upper()}GROW15"
    return {
        "target_segment": target_segment,
        "suggested_headline": f"Special Exclusive Reward for {target_segment}",
        "suggested_email_subject": f"A gift from {business_name} for your next purchase",
        "suggested_body_copy": f"Thank you for choosing {business_name}! Use coupon code {discount_code} during your next PayPal checkout for 15% off.",
        "discount_code": discount_code,
        "discount_pct": 15.0
    }
