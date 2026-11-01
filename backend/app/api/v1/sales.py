import csv
import io
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status, Request
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_merchant, get_optional_current_user
from backend.app.models.user import MerchantProfile, User
from backend.app.models.inventory import Product, DailySale, InventoryMovement
from backend.app.models.audit import AuditLog
from backend.app.schemas.product import DailySaleCreate, DailySaleResponse

router = APIRouter(prefix="/sales", tags=["Sales"])

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

    # Check if a record already exists for this product and date
    existing_sale = db.query(DailySale).filter(
        DailySale.merchant_id == current_merchant.id,
        DailySale.product_id == product.id,
        DailySale.sales_date == sale_in.sales_date
    ).first()

    if existing_sale:
        existing_sale.units_sold += sale_in.units_sold
        existing_sale.revenue += rev_dec
        sale_obj = existing_sale
    else:
        sale_obj = DailySale(
            merchant_id=current_merchant.id,
            product_id=product.id,
            sales_date=sale_in.sales_date,
            units_sold=sale_in.units_sold,
            revenue=rev_dec,
            channel=sale_in.channel or "PAYPAL_CHECKOUT"
        )
        db.add(sale_obj)

    # Stock adjustment
    if deduct_stock:
        new_stock = max(0, product.current_stock - sale_in.units_sold)
        product.current_stock = new_stock

        movement = InventoryMovement(
            merchant_id=current_merchant.id,
            product_id=product.id,
            movement_type="SALE",
            quantity=-sale_in.units_sold,
            stock_after=new_stock,
            reason=f"Recorded sales for date {sale_in.sales_date}"
        )
        db.add(movement)

    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id if current_user else None,
        action="SALE_RECORDED",
        resource_type="DAILY_SALE",
        resource_id=sale_obj.id,
        details_json=f'{{"product": "{product.sku}", "units": {sale_in.units_sold}, "revenue": {float(rev_dec)}}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(sale_obj)

    return DailySaleResponse(
        id=sale_obj.id,
        product_id=product.id,
        product_name=product.name,
        sku=product.sku,
        sales_date=sale_obj.sales_date,
        units_sold=sale_obj.units_sold,
        revenue=float(sale_obj.revenue),
        channel=sale_obj.channel,
        created_at=sale_obj.created_at
    )

@router.post("/import-csv")
async def import_sales_csv(
    request: Request,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
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

    if not decoded:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No CSV data provided.")

    reader = csv.DictReader(io.StringIO(decoded))

    imported = 0
    errors = []

    for row in reader:
        sku = row.get("sku", "").strip().upper()
        date_str = row.get("sales_date", "").strip()
        units_str = row.get("units_sold", "").strip()

        if not sku or not date_str or not units_str:
            continue

        product = db.query(Product).filter(
            Product.merchant_id == current_merchant.id,
            Product.sku == sku
        ).first()

        if not product:
            errors.append(f"SKU {sku} not found")
            continue

        try:
            units = int(units_str)
            rev_str = row.get("revenue", "").strip()
            revenue = Decimal(rev_str) if rev_str else Decimal(str(round(float(product.selling_price) * units, 2)))

            existing = db.query(DailySale).filter(
                DailySale.merchant_id == current_merchant.id,
                DailySale.product_id == product.id,
                DailySale.sales_date == date_str
            ).first()

            if existing:
                existing.units_sold = units
                existing.revenue = revenue
            else:
                s = DailySale(
                    merchant_id=current_merchant.id,
                    product_id=product.id,
                    sales_date=date_str,
                    units_sold=units,
                    revenue=revenue
                )
                db.add(s)
            imported += 1
        except Exception as e:
            errors.append(f"Row error: {e}")

    db.commit()
    return {
        "message": f"Successfully imported {imported} daily sales records.",
        "imported_records": imported,
        "errors": errors[:5]
    }
