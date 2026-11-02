from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_merchant, get_optional_current_user
from backend.app.models.user import MerchantProfile, User
from backend.app.models.transaction import Transaction, Customer, Order
from backend.app.models.audit import AuditLog
from backend.app.schemas.transaction import (
    TransactionResponse,
    CustomerResponse,
    ManualTransactionCreate,
    PayPalTransactionImport,
)
from backend.app.services.unified_transaction_service import UnifiedTransactionService

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    type_filter: Optional[str] = Query("ALL", alias="type"),
    source_filter: Optional[str] = Query(None, alias="source"),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    List transactions with multi-tenant scoping and filters for type, payment source, and status.
    """
    query = db.query(Transaction).filter(Transaction.merchant_id == current_merchant.id)

    if type_filter and type_filter != "ALL":
        query = query.filter(Transaction.type == type_filter.upper())

    if source_filter and source_filter != "ALL":
        query = query.filter(Transaction.payment_source.ilike(f"%{source_filter}%"))

    if status_filter and status_filter != "ALL":
        query = query.filter(Transaction.status == status_filter.upper())

    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            (Transaction.title.ilike(s)) |
            (Transaction.category.ilike(s)) |
            (Transaction.paypal_transaction_id.ilike(s)) |
            (Transaction.external_reference_id.ilike(s))
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
            external_reference_id=t.external_reference_id,
            import_job_id=t.import_job_id,
            type=t.type,
            gross_amount=float(t.gross_amount),
            fee_amount=float(t.fee_amount),
            net_amount=float(t.net_amount),
            currency=t.currency,
            status=t.status,
            payment_source=t.payment_source,
            transaction_date=t.transaction_date,
            title=t.title,
            category=t.category,
            notes=t.notes
        ))
    return results

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def record_manual_transaction(
    tx_in: ManualTransactionCreate,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Records a manual income, expense, or refund transaction through UnifiedTransactionService.
    Explicit source identification: MANUAL.
    """
    now_utc = datetime.now(timezone.utc)
    tx_date = tx_in.transaction_date or now_utc

    customer_info = None
    if tx_in.customer_email:
        customer_info = {
            "email": tx_in.customer_email.lower().strip(),
            "first_name": tx_in.customer_first_name,
            "last_name": tx_in.customer_last_name,
            "city": "Unknown",
            "country": "USA"
        }

    tx, is_dup, err = UnifiedTransactionService.ingest_transaction(
        db=db,
        merchant_id=current_merchant.id,
        source_type="MANUAL",
        gross_amount=tx_in.gross_amount,
        fee_amount=tx_in.fee_amount,
        currency=tx_in.currency or current_merchant.currency,
        tx_type=tx_in.type.upper(),
        tx_status="COMPLETED",
        transaction_date=tx_date,
        title=tx_in.title.strip(),
        category=tx_in.category.strip(),
        notes=tx_in.notes,
        customer_info=customer_info,
        deduct_inventory=False
    )

    cust_name = None
    if tx.customer:
        cust_name = f"{tx.customer.first_name or ''} {tx.customer.last_name or ''}".strip() or tx.customer.email

    return TransactionResponse(
        id=tx.id,
        order_id=tx.order_id,
        customer_id=tx.customer_id,
        customer_name=cust_name,
        paypal_transaction_id=tx.paypal_transaction_id,
        external_reference_id=tx.external_reference_id,
        import_job_id=tx.import_job_id,
        type=tx.type,
        gross_amount=float(tx.gross_amount),
        fee_amount=float(tx.fee_amount),
        net_amount=float(tx.net_amount),
        currency=tx.currency,
        status=tx.status,
        payment_source=tx.payment_source,
        transaction_date=tx.transaction_date,
        title=tx.title,
        category=tx.category,
        notes=tx.notes
    )

@router.post("/import-paypal", response_model=TransactionResponse)
def import_paypal_transaction(
    tx_in: PayPalTransactionImport,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Imports a verified PayPal transaction record with idempotency enforcement.
    Explicit source identification: PAYPAL_IMPORT.
    """
    now_utc = datetime.now(timezone.utc)
    tx_date = tx_in.transaction_date or now_utc

    customer_info = None
    if tx_in.customer_email:
        name_parts = (tx_in.customer_name or "").strip().split(" ", 1)
        customer_info = {
            "email": tx_in.customer_email.lower().strip(),
            "first_name": name_parts[0] if name_parts else None,
            "last_name": name_parts[1] if len(name_parts) > 1 else None,
            "city": "Unknown",
            "country": "USA"
        }

    tx, is_dup, err = UnifiedTransactionService.ingest_transaction(
        db=db,
        merchant_id=current_merchant.id,
        source_type="PAYPAL_IMPORT",
        gross_amount=tx_in.gross_amount,
        fee_amount=tx_in.fee_amount,
        net_amount=tx_in.net_amount,
        currency=tx_in.currency,
        tx_type=tx_in.type.upper(),
        tx_status=tx_in.status.upper(),
        transaction_date=tx_date,
        external_id=tx_in.paypal_transaction_id,
        title=tx_in.title.strip(),
        category=tx_in.category.strip(),
        notes=tx_in.notes,
        customer_info=customer_info,
        deduct_inventory=False
    )

    cust_name = None
    if tx.customer:
        cust_name = f"{tx.customer.first_name or ''} {tx.customer.last_name or ''}".strip() or tx.customer.email

    return TransactionResponse(
        id=tx.id,
        order_id=tx.order_id,
        customer_id=tx.customer_id,
        customer_name=cust_name,
        paypal_transaction_id=tx.paypal_transaction_id,
        external_reference_id=tx.external_reference_id,
        import_job_id=tx.import_job_id,
        type=tx.type,
        gross_amount=float(tx.gross_amount),
        fee_amount=float(tx.fee_amount),
        net_amount=float(tx.net_amount),
        currency=tx.currency,
        status=tx.status,
        payment_source=tx.payment_source,
        transaction_date=tx.transaction_date,
        title=tx.title,
        category=tx.category,
        notes=tx.notes
    )

@router.get("/summary")
def get_transaction_summary(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Phase 5: Accurate summary enforcing:
    - Never count pending, failed, or refunded transactions as completed revenue.
    - Explicit currency isolation (matches merchant's base currency).
    """
    # Total received completed sales
    total_received = db.query(func.coalesce(func.sum(Transaction.net_amount), 0.0)).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.status == "COMPLETED",
        Transaction.type == "RECEIVED",
        Transaction.currency == current_merchant.currency
    ).scalar()

    # Total payouts / disbursements
    total_payments = db.query(func.coalesce(func.sum(Transaction.gross_amount), 0.0)).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.status == "COMPLETED",
        Transaction.type == "PAYMENT",
        Transaction.currency == current_merchant.currency
    ).scalar()

    # Total fees paid
    total_fees = db.query(func.coalesce(func.sum(Transaction.fee_amount), 0.0)).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.status == "COMPLETED",
        Transaction.currency == current_merchant.currency
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
            total_spend=round(float(c.total_spend), 2),
            order_count=c.order_count,
            first_purchase_at=c.first_purchase_at,
            last_purchase_at=c.last_purchase_at
        )
        for c in customers
    ]
