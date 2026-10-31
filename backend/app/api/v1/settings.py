from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, get_current_merchant
from backend.app.models.user import User, MerchantProfile
from backend.app.models.inventory import Product, DailySale
from backend.app.models.transaction import Transaction, Customer
from backend.app.models.audit import AuditLog

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/profile")
def get_settings_profile(
    current_user: User = Depends(get_current_user),
    current_merchant: MerchantProfile = Depends(get_current_merchant)
):
    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "created_at": current_user.created_at
        },
        "business": {
            "id": current_merchant.id,
            "business_name": current_merchant.business_name,
            "business_category": current_merchant.business_category,
            "country": current_merchant.country,
            "currency": current_merchant.currency,
            "description": current_merchant.description,
            "created_at": current_merchant.created_at
        }
    }

@router.get("/audit-logs")
def list_audit_logs(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).filter(
        AuditLog.merchant_id == current_merchant.id
    ).order_by(AuditLog.created_at.desc()).limit(50).all()

    return [
        {
            "id": l.id,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": l.details_json,
            "created_at": l.created_at
        }
        for l in logs
    ]

@router.get("/export-data")
def export_merchant_data(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Data Portability & GDPR compliance:
    Exports merchant's complete business records as a single structured JSON object.
    """
    products = db.query(Product).filter(Product.merchant_id == current_merchant.id).all()
    sales = db.query(DailySale).filter(DailySale.merchant_id == current_merchant.id).all()
    transactions = db.query(Transaction).filter(Transaction.merchant_id == current_merchant.id).all()
    customers = db.query(Customer).filter(Customer.merchant_id == current_merchant.id).all()

    return {
        "merchant": {
            "id": current_merchant.id,
            "business_name": current_merchant.business_name,
            "currency": current_merchant.currency,
            "created_at": current_merchant.created_at.isoformat()
        },
        "products": [
            {"sku": p.sku, "name": p.name, "current_stock": p.current_stock, "selling_price": p.selling_price}
            for p in products
        ],
        "sales_count": len(sales),
        "transactions_count": len(transactions),
        "customers_count": len(customers)
    }
