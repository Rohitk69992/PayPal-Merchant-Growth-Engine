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
        query = query.filter(Transaction.type == type_filter.upper())

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
    Records a manual income or expense transaction for the merchant.
    Explicit source identification: MANUAL.
    """
    now_utc = datetime.now(timezone.utc)
    tx_date = tx_in.transaction_date or now_utc
    currency = (tx_in.currency or current_merchant.currency).upper()
    net_amt = round(tx_in.gross_amount - tx_in.fee_amount, 2)

    customer_id = None
    customer_name = None
    if tx_in.customer_email:
        norm_email = tx_in.customer_email.lower().strip()
        customer = db.query(Customer).filter(
            Customer.merchant_id == current_merchant.id,
            Customer.email == norm_email
        ).first()

        if customer:
            if tx_in.type.upper() == "RECEIVED":
                customer.total_spend += Decimal(str(tx_in.gross_amount))
                customer.order_count += 1
                customer.last_purchase_at = tx_date
        else:
            customer = Customer(
                merchant_id=current_merchant.id,
                email=norm_email,
                first_name=tx_in.customer_first_name,
                last_name=tx_in.customer_last_name,
                total_spend=Decimal(str(tx_in.gross_amount)) if tx_in.type.upper() == "RECEIVED" else Decimal("0.00"),
                order_count=1 if tx_in.type.upper() == "RECEIVED" else 0,
                first_purchase_at=tx_date,
                last_purchase_at=tx_date,
            )
            db.add(customer)
        db.flush()
        customer_id = customer.id
        customer_name = f"{customer.first_name or ''} {customer.last_name or ''}".strip() or customer.email

    tx = Transaction(
        merchant_id=current_merchant.id,
        customer_id=customer_id,
        type=tx_in.type.upper(),
        gross_amount=Decimal(str(tx_in.gross_amount)),
        fee_amount=Decimal(str(tx_in.fee_amount)),
        net_amount=Decimal(str(net_amt)),
        currency=currency,
        status="COMPLETED",
        payment_source="MANUAL",
        transaction_date=tx_date,
        title=tx_in.title.strip(),
        category=tx_in.category.strip(),
        notes=tx_in.notes
    )
    db.add(tx)

    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id if current_user else None,
        action="MANUAL_TRANSACTION_RECORDED",
        resource_type="TRANSACTION",
        resource_id=tx.id,
        details_json=f'{{"type": "{tx.type}", "gross": {tx_in.gross_amount}, "net": {net_amt}}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(tx)

    return TransactionResponse(
        id=tx.id,
        order_id=tx.order_id,
        customer_id=customer_id,
        customer_name=customer_name,
        paypal_transaction_id=None,
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
    # Idempotency check: prevent duplicate imports
    existing = db.query(Transaction).filter(
        Transaction.merchant_id == current_merchant.id,
        Transaction.paypal_transaction_id == tx_in.paypal_transaction_id
    ).first()

    if existing:
        cust_name = None
        if existing.customer:
            cust_name = f"{existing.customer.first_name or ''} {existing.customer.last_name or ''}".strip() or existing.customer.email
        return TransactionResponse(
            id=existing.id,
            order_id=existing.order_id,
            customer_id=existing.customer_id,
            customer_name=cust_name,
            paypal_transaction_id=existing.paypal_transaction_id,
            type=existing.type,
            gross_amount=float(existing.gross_amount),
            fee_amount=float(existing.fee_amount),
            net_amount=float(existing.net_amount),
            currency=existing.currency,
            status=existing.status,
            payment_source=existing.payment_source,
            transaction_date=existing.transaction_date,
            title=existing.title,
            category=existing.category,
            notes=existing.notes
        )

    now_utc = datetime.now(timezone.utc)
    tx_date = tx_in.transaction_date or now_utc
    net_amt = tx_in.net_amount if tx_in.net_amount is not None else round(tx_in.gross_amount - tx_in.fee_amount, 2)

    customer_id = None
    customer_name = None
    if tx_in.customer_email:
        norm_email = tx_in.customer_email.lower().strip()
        customer = db.query(Customer).filter(
            Customer.merchant_id == current_merchant.id,
            Customer.email == norm_email
        ).first()

        if customer:
            if tx_in.type.upper() == "RECEIVED":
                customer.total_spend += Decimal(str(tx_in.gross_amount))
                customer.order_count += 1
                customer.last_purchase_at = tx_date
        else:
            first_name = tx_in.customer_name.split()[0] if tx_in.customer_name else None
            last_name = " ".join(tx_in.customer_name.split()[1:]) if tx_in.customer_name and len(tx_in.customer_name.split()) > 1 else None
            customer = Customer(
                merchant_id=current_merchant.id,
                email=norm_email,
                first_name=first_name,
                last_name=last_name,
                total_spend=Decimal(str(tx_in.gross_amount)) if tx_in.type.upper() == "RECEIVED" else Decimal("0.00"),
                order_count=1 if tx_in.type.upper() == "RECEIVED" else 0,
                first_purchase_at=tx_date,
                last_purchase_at=tx_date,
            )
            db.add(customer)
        db.flush()
        customer_id = customer.id
        customer_name = f"{customer.first_name or ''} {customer.last_name or ''}".strip() or customer.email

    tx = Transaction(
        merchant_id=current_merchant.id,
        customer_id=customer_id,
        paypal_transaction_id=tx_in.paypal_transaction_id,
        type=tx_in.type.upper(),
        gross_amount=Decimal(str(tx_in.gross_amount)),
        fee_amount=Decimal(str(tx_in.fee_amount)),
        net_amount=Decimal(str(net_amt)),
        currency=tx_in.currency.upper(),
        status=tx_in.status.upper(),
        payment_source="PAYPAL_IMPORT",
        transaction_date=tx_date,
        title=tx_in.title.strip(),
        category=tx_in.category.strip(),
        notes=tx_in.notes
    )
    db.add(tx)

    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id if current_user else None,
        action="PAYPAL_TRANSACTION_IMPORTED",
        resource_type="TRANSACTION",
        resource_id=tx.id,
        details_json=f'{{"paypal_id": "{tx_in.paypal_transaction_id}", "gross": {tx_in.gross_amount}}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(tx)

    return TransactionResponse(
        id=tx.id,
        order_id=tx.order_id,
        customer_id=customer_id,
        customer_name=customer_name,
        paypal_transaction_id=tx.paypal_transaction_id,
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
            total_spend=round(float(c.total_spend), 2),
            order_count=c.order_count,
            first_purchase_at=c.first_purchase_at,
            last_purchase_at=c.last_purchase_at
        )
        for c in customers
    ]
