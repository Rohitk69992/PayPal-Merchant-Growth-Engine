from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_merchant
from backend.app.models.user import MerchantProfile
from backend.app.models.transaction import Transaction, Customer, Order
from backend.app.schemas.transaction import TransactionResponse, CustomerResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    type_filter: Optional[str] = Query("ALL", alias="type"),
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.merchant_id == current_merchant.id)

    if type_filter and type_filter != "ALL":
        query = query.filter(Transaction.type == type_filter)

    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            (Transaction.title.ilike(s)) |
            (Transaction.category.ilike(s)) |
            (Transaction.paypal_transaction_id.ilike(s))
        )

    txs = query.order_by(Transaction.transaction_date.desc()).limit(limit).all()

    results = []
    for t in txs:
        cust_name = None
        if t.customer:
            cust_name = f"{t.customer.first_name or ''} {t.customer.last_name or ''}".strip() or t.customer.email

        results.append(TransactionResponse(
            id=t.id,
            order_id=t.order_id,
            customer_id=t.customer_id,
            customer_name=cust_name,
            paypal_transaction_id=t.paypal_transaction_id,
            type=t.type,
            gross_amount=t.gross_amount,
            fee_amount=t.fee_amount,
            net_amount=t.net_amount,
            currency=t.currency,
            status=t.status,
            payment_source=t.payment_source,
            transaction_date=t.transaction_date,
            title=t.title,
            category=t.category,
            notes=t.notes
        ))
    return results

@router.get("/summary")
def get_transaction_summary(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    # Total received
    total_received = db.query(func.coalesce(func.sum(Transaction.net_amount), 0.0)).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.status == "COMPLETED",
        Transaction.type == "RECEIVED"
    ).scalar()

    # Total payouts / disbursements
    total_payments = db.query(func.coalesce(func.sum(Transaction.gross_amount), 0.0)).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.status == "COMPLETED",
        Transaction.type == "PAYMENT"
    ).scalar()

    total_fees = db.query(func.coalesce(func.sum(Transaction.fee_amount), 0.0)).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.status == "COMPLETED"
    ).scalar()

    tx_count = db.query(Transaction).filter(
        Transaction.merchant_id == current_merchant.id
    ).count()

    current_balance = round(float(total_received) - float(total_payments), 2)

    return {
        "current_balance": current_balance,
        "total_received": round(float(total_received), 2),
        "total_payments": round(float(total_payments), 2),
        "total_processor_fees": round(float(total_fees), 2),
        "transaction_count": tx_count,
        "currency": current_merchant.currency
    }

@router.get("/customers", response_model=List[CustomerResponse])
def list_customers(
    limit: int = Query(50, ge=1, le=500),
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    customers = db.query(Customer).filter(
        Customer.merchant_id == current_merchant.id
    ).order_by(Customer.total_spend.desc()).limit(limit).all()

    return [
        CustomerResponse(
            id=c.id,
            email=c.email,
            first_name=c.first_name,
            last_name=c.last_name,
            city=c.city,
            country=c.country,
            total_spend=round(c.total_spend, 2),
            order_count=c.order_count,
            first_purchase_at=c.first_purchase_at,
            last_purchase_at=c.last_purchase_at
        )
        for c in customers
    ]
