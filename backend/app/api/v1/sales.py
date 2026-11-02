import csv
import io
import json
import uuid
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status, Request, Response
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_merchant, get_optional_current_user
from backend.app.models.user import MerchantProfile, User
from backend.app.models.inventory import Product, DailySale, InventoryMovement
from backend.app.models.transaction import Transaction, Customer, Order, OrderItem, DataImportJob
from backend.app.models.audit import AuditLog
from backend.app.schemas.product import DailySaleCreate, DailySaleResponse
from backend.app.schemas.transaction import (
    ManualSaleRequest,
    TransactionResponse,
    CsvPreviewResponse,
    CsvPreviewRow,
    CsvRowError,
    ImportSummaryResponse,
    DataImportJobResponse
)
from backend.app.services.unified_transaction_service import UnifiedTransactionService

router = APIRouter(prefix="/sales", tags=["Sales"])

CSV_TEMPLATE_CONTENT = (
    "date,sku,product_name,quantity,unit_price,total_amount,currency,customer_email,customer_name,payment_method,status,external_id\n"
)

COLUMN_SYNONYMS = {
    "date": ["date", "sales_date", "transaction_date", "order_date", "timestamp"],
    "sku": ["sku", "product_sku", "item_sku", "product_code"],
    "product_name": ["product_name", "product", "item_name", "name", "title"],
    "quantity": ["quantity", "qty", "units_sold", "units", "count"],
    "unit_price": ["unit_price", "price", "selling_price", "rate"],
    "total_amount": ["total_amount", "amount", "revenue", "gross_amount", "total"],
    "currency": ["currency", "currency_code"],
    "customer_email": ["customer_email", "email", "buyer_email"],
    "customer_name": ["customer_name", "customer", "buyer_name", "name"],
    "payment_method": ["payment_method", "channel", "payment_source", "method"],
    "status": ["status", "payment_status", "order_status"],
    "external_id": ["external_id", "transaction_id", "reference_id", "order_id", "invoice_no", "invoice_number"]
}

def resolve_column(field: str, headers: List[str]) -> Optional[str]:
    norm_headers = {h.lower().strip().replace(" ", "_"): h for h in headers}
    for syn in COLUMN_SYNONYMS.get(field, [field]):
        if syn in norm_headers:
            return norm_headers[syn]
    return None

@router.get("/csv-template")
def download_csv_template():
    """Returns downloadable CSV template for historical sales imports."""
    return Response(
        content=CSV_TEMPLATE_CONTENT,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_import_template.csv"}
    )

@router.get("", response_model=List[DailySaleResponse])
@router.get("/daily", response_model=List[DailySaleResponse])
def list_daily_sales(
    product_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    query = db.query(DailySale, Product).join(
        Product, DailySale.product_id == Product.id
    ).filter(DailySale.merchant_id == current_merchant.id)

    if product_id:
        query = query.filter(DailySale.product_id == product_id)
    if start_date:
        query = query.filter(DailySale.sales_date >= start_date)
    if end_date:
        query = query.filter(DailySale.sales_date <= end_date)

    results = query.order_by(DailySale.sales_date.desc()).limit(limit).all()

    return [
        DailySaleResponse(
            id=s.id,
            product_id=s.product_id,
            product_name=p.name,
            sku=p.sku,
            sales_date=s.sales_date,
            units_sold=s.units_sold,
            revenue=float(s.revenue),
            channel=s.channel,
            created_at=s.created_at
        )
        for s, p in results
    ]

@router.post("", response_model=DailySaleResponse, status_code=status.HTTP_201_CREATED)
@router.post("/daily", response_model=DailySaleResponse, status_code=status.HTTP_201_CREATED)
def record_daily_sale(
    sale_in: DailySaleCreate,
    deduct_stock: bool = True,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Records a daily sale event and updates stock while linking into the unified architecture.
    """
    product = db.query(Product).filter(
        Product.id == sale_in.product_id,
        Product.merchant_id == current_merchant.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    if sale_in.revenue is not None:
        rev_dec = Decimal(str(round(sale_in.revenue, 2)))
    else:
        rev_dec = Decimal(str(round(float(product.selling_price) * sale_in.units_sold, 2)))

    # Ingest into Unified Transaction Architecture
    tx, is_dup, err = UnifiedTransactionService.ingest_transaction(
        db=db,
        merchant_id=current_merchant.id,
        source_type=sale_in.channel or "MANUAL_SALE",
        gross_amount=float(rev_dec),
        fee_amount=0.0,
        currency=current_merchant.currency,
        tx_type="RECEIVED",
        tx_status="COMPLETED",
        transaction_date=datetime.strptime(sale_in.sales_date, "%Y-%m-%d").replace(tzinfo=timezone.utc),
        title=f"Sale - {product.name}",
        category="Sales Revenue",
        line_items=[{
            "product_id": product.id,
            "sku": product.sku,
            "quantity": sale_in.units_sold,
            "unit_price": float(rev_dec) / max(1, sale_in.units_sold),
            "product_name": product.name
        }],
        deduct_inventory=deduct_stock
    )

    # Resolve daily sale record
    sale_obj = db.query(DailySale).filter(
        DailySale.merchant_id == current_merchant.id,
        DailySale.product_id == product.id,
        DailySale.sales_date == sale_in.sales_date
    ).first()

    return DailySaleResponse(
        id=sale_obj.id if sale_obj else tx.id,
        product_id=product.id,
        product_name=product.name,
        sku=product.sku,
        sales_date=sale_in.sales_date,
        units_sold=sale_obj.units_sold if sale_obj else sale_in.units_sold,
        revenue=float(sale_obj.revenue if sale_obj else rev_dec),
        channel=sale_in.channel or "MANUAL_SALE",
        created_at=sale_obj.created_at if sale_obj else tx.created_at
    )

@router.post("/manual", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def record_manual_sale(
    sale_req: ManualSaleRequest,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Phase 3: Merchant-facing manual sales entry.
    Validates product selection, customer info, quantity, stock, currency, and payment method.
    """
    product = None
    if sale_req.product_id:
        product = db.query(Product).filter(
            Product.id == sale_req.product_id,
            Product.merchant_id == current_merchant.id
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail="Selected product was not found in catalog.")
    elif sale_req.sku:
        product = db.query(Product).filter(
            Product.sku == sale_req.sku.strip().upper(),
            Product.merchant_id == current_merchant.id
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product with SKU '{sale_req.sku}' not found.")

    qty = max(1, sale_req.quantity)
    if product and sale_req.deduct_inventory and sale_req.transaction_status == "COMPLETED":
        if product.current_stock < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient inventory for {product.sku}. Stock on hand: {product.current_stock}, Requested: {qty}"
            )

    unit_price = sale_req.unit_price
    if unit_price is None and product:
        unit_price = float(product.selling_price)
    elif unit_price is None:
        unit_price = (sale_req.total_amount / qty) if sale_req.total_amount else 10.0

    total_amt = sale_req.total_amount
    if total_amt is None:
        total_amt = round(unit_price * qty, 2)

    line_items = []
    if product or sale_req.sku:
        line_items.append({
            "product_id": product.id if product else None,
            "sku": product.sku if product else sale_req.sku,
            "quantity": qty,
            "unit_price": unit_price,
            "product_name": product.name if product else "Manual Entry Item"
        })

    customer_info = None
    if sale_req.customer_email:
        name_parts = (sale_req.customer_name or "").strip().split(" ", 1)
        customer_info = {
            "email": str(sale_req.customer_email).lower().strip(),
            "first_name": name_parts[0] if name_parts else None,
            "last_name": name_parts[1] if len(name_parts) > 1 else None,
            "city": sale_req.customer_city or "Unknown",
            "country": sale_req.customer_country or "USA"
        }

    now_utc = datetime.now(timezone.utc)
    tx_date = sale_req.transaction_date or now_utc

    tx, is_dup, err = UnifiedTransactionService.ingest_transaction(
        db=db,
        merchant_id=current_merchant.id,
        source_type=f"MANUAL_{sale_req.payment_method.upper()}",
        gross_amount=total_amt,
        fee_amount=0.0,
        currency=sale_req.currency or current_merchant.currency,
        tx_type="RECEIVED",
        tx_status=sale_req.transaction_status.upper(),
        transaction_date=tx_date,
        title=f"Manual Sale - {product.name if product else 'Direct Sale'}",
        category="Sales Revenue",
        notes=sale_req.notes,
        customer_info=customer_info,
        line_items=line_items if line_items else None,
        deduct_inventory=sale_req.deduct_inventory
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

@router.post("/csv-preview", response_model=CsvPreviewResponse)
async def preview_sales_csv(
    request: Request,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Phase 4: CSV Preview before import.
    Parses CSV content safely in memory, maps columns, checks required fields, and flags invalid/duplicate rows.
    """
    content_type = request.headers.get("content-type", "")
    decoded = ""
    if "application/json" in content_type:
        body = await request.json()
        decoded = body.get("csv_content", "")
    elif "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        if file and hasattr(file, "read"):
            content = await file.read()
            decoded = content.decode("utf-8-sig", errors="replace")
        elif isinstance(file, str):
            decoded = file
    else:
        raw_body = await request.body()
        decoded = raw_body.decode("utf-8-sig", errors="replace")

    if not decoded.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No CSV data provided.")

    stream = io.StringIO(decoded)
    reader = csv.reader(stream)
    try:
        raw_headers = next(reader)
    except StopIteration:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV is empty.")

    headers = [h.strip() for h in raw_headers if h.strip()]
    col_date = resolve_column("date", headers)
    col_sku = resolve_column("sku", headers)
    col_name = resolve_column("product_name", headers)
    col_qty = resolve_column("quantity", headers)
    col_price = resolve_column("unit_price", headers)
    col_total = resolve_column("total_amount", headers)
    col_curr = resolve_column("currency", headers)
    col_email = resolve_column("customer_email", headers)
    col_cname = resolve_column("customer_name", headers)
    col_source = resolve_column("payment_method", headers)
    col_status = resolve_column("status", headers)
    col_ext_id = resolve_column("external_id", headers)

    if not col_date:
        raise HTTPException(status_code=400, detail="Missing required 'date' column in CSV.")

    # Cache existing products for this merchant
    products_by_sku = {
        p.sku.upper(): p for p in db.query(Product).filter(Product.merchant_id == current_merchant.id).all()
    }

    # Cache existing external IDs for duplicate detection
    existing_ext_ids = {
        tx.external_reference_id for tx in db.query(Transaction.external_reference_id).filter(
            Transaction.merchant_id == current_merchant.id,
            Transaction.external_reference_id.isnot(None)
        ).all()
    } | {
        tx.paypal_transaction_id for tx in db.query(Transaction.paypal_transaction_id).filter(
            Transaction.merchant_id == current_merchant.id,
            Transaction.paypal_transaction_id.isnot(None)
        ).all()
    }

    preview_rows: List[CsvPreviewRow] = []
    errors: List[CsvRowError] = []
    total_count = 0
    valid_count = 0
    duplicate_count = 0

    header_indices = {h: idx for idx, h in enumerate(raw_headers)}

    for row_idx, row in enumerate(reader, start=2):
        if not row or all(c.strip() == "" for c in row):
            continue
        total_count += 1

        def get_val(col_name: Optional[str]) -> str:
            if col_name and col_name in header_indices and header_indices[col_name] < len(row):
                return row[header_indices[col_name]].strip()
            return ""

        date_val = get_val(col_date)
        sku_val = get_val(col_sku).upper()
        pname_val = get_val(col_name)
        qty_str = get_val(col_qty)
        price_str = get_val(col_price)
        total_str = get_val(col_total)
        curr_val = get_val(col_curr) or current_merchant.currency
        email_val = get_val(col_email)
        cname_val = get_val(col_cname)
        source_val = get_val(col_source) or "CSV_IMPORT"
        status_val = get_val(col_status).upper() or "COMPLETED"
        ext_id_val = get_val(col_ext_id) or None

        is_valid = True
        err_msg = None

        # Validate date
        parsed_date_str = date_val
        try:
            # Check ISO or YYYY-MM-DD
            if "T" in date_val:
                dt = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
                parsed_date_str = dt.strftime("%Y-%m-%d")
            else:
                datetime.strptime(date_val, "%Y-%m-%d")
        except Exception:
            is_valid = False
            err_msg = f"Invalid date format '{date_val}'. Expected YYYY-MM-DD."
            errors.append(CsvRowError(row_number=row_idx, field="date", error=err_msg, raw_data={"date": date_val}))

        # Validate quantity
        qty = 1
        if qty_str:
            try:
                qty = int(qty_str)
                if qty <= 0:
                    raise ValueError()
            except ValueError:
                is_valid = False
                err_msg = f"Quantity must be a positive integer (got '{qty_str}')."
                errors.append(CsvRowError(row_number=row_idx, field="quantity", error=err_msg))

        # Validate pricing
        prod = products_by_sku.get(sku_val) if sku_val else None
        unit_price = 0.0
        if price_str:
            try:
                unit_price = float(price_str)
            except ValueError:
                is_valid = False
                err_msg = f"Unit price must be numeric (got '{price_str}')."
                errors.append(CsvRowError(row_number=row_idx, field="unit_price", error=err_msg))
        elif prod:
            unit_price = float(prod.selling_price)

        total_amount = 0.0
        if total_str:
            try:
                total_amount = float(total_str)
            except ValueError:
                is_valid = False
                err_msg = f"Total amount must be numeric (got '{total_str}')."
                errors.append(CsvRowError(row_number=row_idx, field="total_amount", error=err_msg))
        else:
            total_amount = round(unit_price * qty, 2)

        # Duplicate detection
        is_dup = False
        if ext_id_val and ext_id_val in existing_ext_ids:
            is_dup = True
            duplicate_count += 1

        val_status = "DUPLICATE" if is_dup else ("VALID" if is_valid else "INVALID")
        if is_valid and not is_dup:
            valid_count += 1

        if len(preview_rows) < 15:
            preview_rows.append(CsvPreviewRow(
                row_number=row_idx,
                date=parsed_date_str,
                sku=sku_val or None,
                product_name=pname_val or (prod.name if prod else None),
                quantity=qty,
                unit_price=unit_price,
                total_amount=total_amount,
                currency=curr_val.upper(),
                customer_email=email_val or None,
                customer_name=cname_val or None,
                payment_method=source_val,
                status=status_val,
                external_id=ext_id_val,
                validation_status=val_status,
                error_message=err_msg
            ))

    return CsvPreviewResponse(
        total_rows=total_count,
        valid_rows_count=valid_count,
        invalid_rows_count=len(errors),
        duplicate_count=duplicate_count,
        detected_columns=headers,
        preview_rows=preview_rows,
        errors=errors[:50]
    )

@router.post("/import-csv", response_model=ImportSummaryResponse)
@router.post("/csv-import", response_model=ImportSummaryResponse)
async def import_sales_csv(
    request: Request,
    deduct_inventory: bool = Query(False, description="Whether to deduct inventory. Defaults to False to preserve historical stock integrity."),
    skip_duplicates: bool = Query(True, description="Whether to skip already imported transactions."),
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Phase 4: Production CSV import for historical and batch sales.
    Memory-safe streaming with comprehensive invalid-row reporting and duplicate prevention.
    """
    content_type = request.headers.get("content-type", "")
    decoded = ""
    filename = "sales_import.csv"

    if "application/json" in content_type:
        body = await request.json()
        decoded = body.get("csv_content", "")
        filename = body.get("filename", filename)
    elif "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        if file and hasattr(file, "read"):
            filename = getattr(file, "filename", filename)
            content = await file.read()
            decoded = content.decode("utf-8-sig", errors="replace")
        elif isinstance(file, str):
            decoded = file
    else:
        raw_body = await request.body()
        decoded = raw_body.decode("utf-8-sig", errors="replace")

    if not decoded.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No CSV data provided.")

    # Create DataImportJob record
    import_job = DataImportJob(
        merchant_id=current_merchant.id,
        source_type="CSV_IMPORT",
        filename=filename,
        status="PROCESSING",
        total_rows=0,
        imported_records=0,
        failed_records=0,
        skipped_duplicates=0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(import_job)
    db.commit()

    stream = io.StringIO(decoded)
    reader = csv.reader(stream)
    try:
        raw_headers = next(reader)
    except StopIteration:
        import_job.status = "FAILED"
        import_job.error_summary = json.dumps([{"error": "Empty CSV file"}])
        import_job.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file is empty.")

    headers = [h.strip() for h in raw_headers if h.strip()]
    col_date = resolve_column("date", headers)
    col_sku = resolve_column("sku", headers)
    col_name = resolve_column("product_name", headers)
    col_qty = resolve_column("quantity", headers)
    col_price = resolve_column("unit_price", headers)
    col_total = resolve_column("total_amount", headers)
    col_curr = resolve_column("currency", headers)
    col_email = resolve_column("customer_email", headers)
    col_cname = resolve_column("customer_name", headers)
    col_source = resolve_column("payment_method", headers)
    col_status = resolve_column("status", headers)
    col_ext_id = resolve_column("external_id", headers)

    if not col_date:
        import_job.status = "FAILED"
        import_job.error_summary = json.dumps([{"error": "Missing required 'date' column."}])
        import_job.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=400, detail="Missing required 'date' column in CSV.")

    header_indices = {h: idx for idx, h in enumerate(raw_headers)}
    total_rows = 0
    imported_count = 0
    failed_count = 0
    duplicate_count = 0
    row_errors = []

    for row_idx, row in enumerate(reader, start=2):
        if not row or all(c.strip() == "" for c in row):
            continue
        total_rows += 1

        def get_val(col_name: Optional[str]) -> str:
            if col_name and col_name in header_indices and header_indices[col_name] < len(row):
                return row[header_indices[col_name]].strip()
            return ""

        date_val = get_val(col_date)
        sku_val = get_val(col_sku).upper()
        pname_val = get_val(col_name)
        qty_str = get_val(col_qty)
        price_str = get_val(col_price)
        total_str = get_val(col_total)
        curr_val = get_val(col_curr) or current_merchant.currency
        email_val = get_val(col_email)
        cname_val = get_val(col_cname)
        source_val = get_val(col_source) or "CSV_IMPORT"
        status_val = get_val(col_status).upper() or "COMPLETED"
        ext_id_val = get_val(col_ext_id) or None

        # Parse date
        try:
            if "T" in date_val:
                dt = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
            else:
                dt = datetime.strptime(date_val, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            failed_count += 1
            row_errors.append({"row": row_idx, "field": "date", "error": f"Invalid date '{date_val}'"})
            continue

        # Parse quantity
        qty = 1
        if qty_str:
            try:
                qty = int(qty_str)
                if qty <= 0:
                    raise ValueError()
            except ValueError:
                failed_count += 1
                row_errors.append({"row": row_idx, "field": "quantity", "error": f"Invalid quantity '{qty_str}'"})
                continue

        # Parse pricing
        unit_price = None
        if price_str:
            try:
                unit_price = float(price_str)
            except ValueError:
                failed_count += 1
                row_errors.append({"row": row_idx, "field": "unit_price", "error": f"Invalid unit price '{price_str}'"})
                continue

        total_amount = None
        if total_str:
            try:
                total_amount = float(total_str)
            except ValueError:
                failed_count += 1
                row_errors.append({"row": row_idx, "field": "total_amount", "error": f"Invalid total amount '{total_str}'"})
                continue

        if total_amount is None:
            if unit_price is not None:
                total_amount = round(unit_price * qty, 2)
            else:
                # Look up product price
                prod = db.query(Product).filter(Product.merchant_id == current_merchant.id, Product.sku == sku_val).first() if sku_val else None
                if prod:
                    unit_price = float(prod.selling_price)
                    total_amount = round(unit_price * qty, 2)
                else:
                    failed_count += 1
                    row_errors.append({"row": row_idx, "field": "pricing", "error": "Cannot determine price or total amount."})
                    continue

        line_items = []
        if sku_val or pname_val:
            line_items.append({
                "sku": sku_val or None,
                "quantity": qty,
                "unit_price": unit_price if unit_price is not None else (total_amount / qty),
                "product_name": pname_val or (f"Item {sku_val}" if sku_val else "Imported Item")
            })

        customer_info = None
        if email_val:
            name_parts = (cname_val or "").strip().split(" ", 1)
            customer_info = {
                "email": email_val.lower().strip(),
                "first_name": name_parts[0] if name_parts else None,
                "last_name": name_parts[1] if len(name_parts) > 1 else None,
                "city": "Unknown",
                "country": "USA"
            }

        try:
            tx, is_dup, err = UnifiedTransactionService.ingest_transaction(
                db=db,
                merchant_id=current_merchant.id,
                source_type="CSV_IMPORT",
                gross_amount=total_amount,
                fee_amount=0.0,
                currency=curr_val,
                tx_type="RECEIVED",
                tx_status=status_val,
                transaction_date=dt,
                external_id=ext_id_val,
                customer_info=customer_info,
                line_items=line_items if line_items else None,
                deduct_inventory=deduct_inventory,
                import_job_id=import_job.id
            )
            if is_dup:
                duplicate_count += 1
                if not skip_duplicates:
                    failed_count += 1
                    row_errors.append({"row": row_idx, "field": "external_id", "error": f"Duplicate transaction ID '{ext_id_val}'"})
            else:
                imported_count += 1
        except Exception as e:
            failed_count += 1
            row_errors.append({"row": row_idx, "field": "ingestion", "error": str(e)})

    # Finalize job record
    final_status = "COMPLETED" if failed_count == 0 else ("PARTIAL" if imported_count > 0 else "FAILED")
    import_job.status = final_status
    import_job.total_rows = total_rows
    import_job.imported_records = imported_count
    import_job.failed_records = failed_count
    import_job.skipped_duplicates = duplicate_count
    import_job.error_summary = json.dumps(row_errors[:100]) if row_errors else None
    import_job.completed_at = datetime.now(timezone.utc)
    db.commit()

    return ImportSummaryResponse(
        job_id=import_job.id,
        status=final_status,
        total_rows=total_rows,
        imported_records=imported_count,
        failed_records=failed_count,
        skipped_duplicates=duplicate_count,
        errors=row_errors[:50],
        message=f"Import {final_status.lower()}: {imported_count} records ingested, {duplicate_count} duplicates skipped, {failed_count} errors."
    )

@router.get("/import-history", response_model=List[DataImportJobResponse])
def get_import_history(
    limit: int = Query(20, ge=1, le=100),
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Phase 4: Returns previous CSV and external batch data import jobs.
    """
    jobs = db.query(DataImportJob).filter(
        DataImportJob.merchant_id == current_merchant.id
    ).order_by(DataImportJob.created_at.desc()).limit(limit).all()

    return jobs
