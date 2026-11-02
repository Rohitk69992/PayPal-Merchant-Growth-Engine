import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.models.transaction import Transaction, Customer, Order, OrderItem, DataImportJob
from backend.app.models.inventory import Product, InventoryMovement, DailySale
from backend.app.models.user import MerchantProfile


SUPPORTED_CURRENCIES = {"USD", "EUR", "GBP", "CAD", "AUD", "JPY"}


class UnifiedTransactionService:
    @staticmethod
    def ingest_transaction(
        db: Session,
        merchant_id: str,
        source_type: str,
        gross_amount: float,
        fee_amount: float = 0.0,
        net_amount: Optional[float] = None,
        currency: Optional[str] = None,
        tx_type: str = "RECEIVED",
        tx_status: str = "COMPLETED",
        transaction_date: Optional[datetime] = None,
        title: Optional[str] = None,
        category: Optional[str] = None,
        notes: Optional[str] = None,
        external_id: Optional[str] = None,
        customer_info: Optional[Dict[str, Any]] = None,
        line_items: Optional[List[Dict[str, Any]]] = None,
        deduct_inventory: bool = False,
        import_job_id: Optional[str] = None,
        allow_duplicate: bool = False,
    ) -> Tuple[Transaction, bool, Optional[str]]:
        """
        Unified transaction ingestion engine for all channels:
        - PayPal Live/Sandbox sync & Webhooks
        - Manual Sales Entry
        - CSV-based historical & batch imports

        Returns:
            Tuple[Transaction, is_duplicate: bool, error_message: Optional[str]]
        """
        merchant = db.query(MerchantProfile).filter(MerchantProfile.id == merchant_id).first()
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Merchant profile '{merchant_id}' not found."
            )

        # 1. Currency Resolution & Validation
        curr = (currency or merchant.currency).upper().strip()
        if curr not in SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported currency '{curr}'. Supported currencies: {sorted(SUPPORTED_CURRENCIES)}"
            )

        # 2. Amount decimal precision formatting
        gross_dec = Decimal(str(round(gross_amount, 2)))
        fee_dec = Decimal(str(round(fee_amount, 2)))
        if net_amount is not None:
            net_dec = Decimal(str(round(net_amount, 2)))
        else:
            net_dec = Decimal(str(round(float(gross_dec) - float(fee_dec), 2)))

        now_utc = datetime.now(timezone.utc)
        tx_date = transaction_date or now_utc
        if tx_date.tzinfo is None:
            tx_date = tx_date.replace(tzinfo=timezone.utc)

        norm_type = tx_type.upper().strip()
        norm_status = tx_status.upper().strip()

        # 3. Idempotency & Duplicate Prevention
        if external_id:
            cleaned_ext_id = external_id.strip()
            existing_tx = db.query(Transaction).filter(
                Transaction.merchant_id == merchant_id,
                (Transaction.paypal_transaction_id == cleaned_ext_id) |
                (Transaction.external_reference_id == cleaned_ext_id)
            ).first()

            if existing_tx:
                # If transaction status changed (e.g., from PENDING to COMPLETED or REFUNDED)
                if existing_tx.status != norm_status:
                    previous_status = existing_tx.status
                    existing_tx.status = norm_status
                    if norm_status == "REFUNDED" and previous_status == "COMPLETED":
                        if existing_tx.customer:
                            existing_tx.customer.total_spend = max(
                                Decimal("0.00"),
                                existing_tx.customer.total_spend - existing_tx.gross_amount
                            )
                    db.commit()
                    db.refresh(existing_tx)
                return existing_tx, True, None

        # 4. Customer Resolution
        customer = None
        if customer_info and customer_info.get("email"):
            email_clean = customer_info["email"].lower().strip()
            if email_clean:
                customer = db.query(Customer).filter(
                    Customer.merchant_id == merchant_id,
                    Customer.email == email_clean
                ).first()

                f_name = customer_info.get("first_name")
                l_name = customer_info.get("last_name")
                city = customer_info.get("city") or "Unknown"
                country = customer_info.get("country") or "USA"

                if not customer:
                    customer = Customer(
                        merchant_id=merchant_id,
                        email=email_clean,
                        first_name=f_name,
                        last_name=l_name,
                        city=city,
                        country=country,
                        total_spend=gross_dec if (norm_status == "COMPLETED" and norm_type == "RECEIVED") else Decimal("0.00"),
                        order_count=1 if (norm_status == "COMPLETED" and norm_type == "RECEIVED") else 0,
                        first_purchase_at=tx_date,
                        last_purchase_at=tx_date
                    )
                    db.add(customer)
                    db.flush()
                else:
                    if norm_status == "COMPLETED" and norm_type == "RECEIVED":
                        customer.total_spend += gross_dec
                        customer.order_count += 1
                        customer.last_purchase_at = max(customer.last_purchase_at or tx_date, tx_date)
                    elif norm_status == "REFUNDED" or norm_type == "REFUND":
                        customer.total_spend = max(Decimal("0.00"), customer.total_spend - gross_dec)
                    if f_name and not customer.first_name:
                        customer.first_name = f_name
                    if l_name and not customer.last_name:
                        customer.last_name = l_name

        # 5. Order and Line Items Handling
        order = None
        resolved_items = []
        if line_items:
            order = Order(
                merchant_id=merchant_id,
                customer_id=customer.id if customer else None,
                paypal_order_id=external_id if "PAYPAL" in source_type else None,
                gross_amount=gross_dec,
                fee_amount=fee_dec,
                net_amount=net_dec,
                currency=curr,
                status=norm_status,
                order_date=tx_date
            )
            db.add(order)
            db.flush()

            for item in line_items:
                product = None
                p_id = item.get("product_id")
                p_sku = item.get("sku")

                if p_id:
                    product = db.query(Product).filter(
                        Product.id == p_id,
                        Product.merchant_id == merchant_id
                    ).first()
                elif p_sku:
                    product = db.query(Product).filter(
                        Product.sku == p_sku.strip().upper(),
                        Product.merchant_id == merchant_id
                    ).first()

                qty = int(item.get("quantity", 1))
                if qty <= 0:
                    qty = 1

                u_price = Decimal(str(round(
                    float(item.get("unit_price") if item.get("unit_price") is not None else (product.selling_price if product else gross_dec / qty)),
                    2
                )))
                t_price = Decimal(str(round(float(u_price) * qty, 2)))

                # Stock verification & decrement
                if product:
                    if deduct_inventory and norm_status == "COMPLETED" and norm_type == "RECEIVED":
                        new_stock = max(0, product.current_stock - qty)
                        product.current_stock = new_stock
                        movement = InventoryMovement(
                            merchant_id=merchant_id,
                            product_id=product.id,
                            movement_type="SALE",
                            quantity=-qty,
                            stock_after=new_stock,
                            reason=f"Sale transaction via {source_type} #{external_id or order.id[:8]}",
                            reference_id=external_id or order.id
                        )
                        db.add(movement)

                    # Restock on refund
                    elif (norm_status == "REFUNDED" or norm_type == "REFUND") and deduct_inventory:
                        product.current_stock += qty
                        movement = InventoryMovement(
                            merchant_id=merchant_id,
                            product_id=product.id,
                            movement_type="RETURN",
                            quantity=qty,
                            stock_after=product.current_stock,
                            reason=f"Restock from refunded transaction #{external_id or order.id[:8]}",
                            reference_id=external_id or order.id
                        )
                        db.add(movement)

                    # Synchronize DailySale aggregation for demand forecasting
                    if norm_status == "COMPLETED" and norm_type == "RECEIVED":
                        date_key = tx_date.strftime("%Y-%m-%d")
                        daily_sale = db.query(DailySale).filter(
                            DailySale.merchant_id == merchant_id,
                            DailySale.product_id == product.id,
                            DailySale.sales_date == date_key
                        ).first()

                        if daily_sale:
                            daily_sale.units_sold += qty
                            daily_sale.revenue += t_price
                        else:
                            daily_sale = DailySale(
                                merchant_id=merchant_id,
                                product_id=product.id,
                                sales_date=date_key,
                                units_sold=qty,
                                revenue=t_price,
                                channel=source_type
                            )
                            db.add(daily_sale)

                # Persist order item
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=product.id if product else None,
                    sku=product.sku if product else (p_sku or "NON-CATALOG"),
                    product_name=product.name if product else item.get("product_name", "Line Item"),
                    quantity=qty,
                    unit_price=u_price,
                    total_price=t_price
                )
                db.add(order_item)
                resolved_items.append(order_item)

        # 6. Default Title & Category
        default_title = title
        if not default_title:
            if resolved_items:
                default_title = f"{resolved_items[0].product_name}"
                if len(resolved_items) > 1:
                    default_title += f" +{len(resolved_items) - 1} more"
            elif customer:
                default_title = f"Sale to {customer.first_name or customer.email}"
            else:
                default_title = f"{source_type} Transaction"

        default_category = category or ("Sales Revenue" if norm_type == "RECEIVED" else "Operating Expense" if norm_type == "PAYMENT" else "Refunds & Adjustments")

        # 7. Create Unified Transaction Record
        tx = Transaction(
            merchant_id=merchant_id,
            order_id=order.id if order else None,
            customer_id=customer.id if customer else None,
            paypal_transaction_id=external_id if "PAYPAL" in source_type else None,
            external_reference_id=external_id,
            import_job_id=import_job_id,
            type=norm_type,
            gross_amount=gross_dec,
            fee_amount=fee_dec,
            net_amount=net_dec,
            currency=curr,
            status=norm_status,
            payment_source=source_type,
            transaction_date=tx_date,
            title=default_title.strip(),
            category=default_category.strip(),
            notes=notes
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)

        return tx, False, None
