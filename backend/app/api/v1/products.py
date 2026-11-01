import csv
import io
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status, Request
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_merchant, get_optional_current_user
from backend.app.models.user import MerchantProfile, User
from backend.app.models.inventory import Product, InventoryMovement
from backend.app.models.audit import AuditLog
from backend.app.schemas.product import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter(prefix="/products", tags=["Products"])

def get_product_status(p: Product) -> str:
    if p.current_stock <= 0:
        return "OUT_OF_STOCK"
    elif p.current_stock <= p.safety_stock:
        return "LOW_STOCK"
    return "IN_STOCK"

def build_product_response(p: Product) -> ProductResponse:
    return ProductResponse(
        id=p.id,
        sku=p.sku,
        name=p.name,
        category=p.category,
        unit_cost=float(p.unit_cost),
        selling_price=float(p.selling_price),
        current_stock=p.current_stock,
        safety_stock=p.safety_stock,
        lead_time_days=p.lead_time_days,
        supplier_name=p.supplier_name,
        is_active=p.is_active,
        status=get_product_status(p),
        created_at=p.created_at
    )

@router.get("", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(
        Product.merchant_id == current_merchant.id,
        Product.is_active == True
    )

    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            (Product.name.ilike(s)) | (Product.sku.ilike(s))
        )
    if category and category != "All":
        query = query.filter(Product.category == category)

    products = query.order_by(Product.name.asc()).all()

    results = []
    for p in products:
        p_status = get_product_status(p)
        if status_filter and status_filter != "ALL" and p_status != status_filter:
            continue
        results.append(build_product_response(p))
    return results

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    item: ProductCreate,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    # Check if SKU already exists for this merchant
    norm_sku = item.sku.strip().upper()
    existing = db.query(Product).filter(
        Product.merchant_id == current_merchant.id,
        Product.sku == norm_sku
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SKU '{norm_sku}' already exists in your product catalog."
        )

    product = Product(
        merchant_id=current_merchant.id,
        sku=norm_sku,
        name=item.name.strip(),
        category=item.category.strip(),
        unit_cost=Decimal(str(item.unit_cost)),
        selling_price=Decimal(str(item.selling_price)),
        current_stock=item.current_stock,
        safety_stock=item.safety_stock,
        lead_time_days=item.lead_time_days,
        supplier_name=item.supplier_name.strip(),
        is_active=True
    )
    db.add(product)
    db.flush()

    # Log initial inventory movement
    movement = InventoryMovement(
        merchant_id=current_merchant.id,
        product_id=product.id,
        movement_type="INITIAL",
        quantity=item.current_stock,
        stock_after=item.current_stock,
        reason="Initial catalog stock entry"
    )
    db.add(movement)

    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id if current_user else None,
        action="PRODUCT_CREATED",
        resource_type="PRODUCT",
        resource_id=product.id,
        details_json=f'{{"sku": "{norm_sku}", "name": "{product.name}", "price": {item.selling_price}}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(product)

    return build_product_response(product)

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: str,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_merchant.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    return build_product_response(product)

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    item: ProductUpdate,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_merchant.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    if item.name is not None:
        product.name = item.name.strip()
    if item.category is not None:
        product.category = item.category.strip()
    if item.unit_cost is not None:
        product.unit_cost = Decimal(str(item.unit_cost))
    if item.selling_price is not None:
        product.selling_price = Decimal(str(item.selling_price))
    if item.safety_stock is not None:
        product.safety_stock = item.safety_stock
    if item.lead_time_days is not None:
        product.lead_time_days = item.lead_time_days
    if item.supplier_name is not None:
        product.supplier_name = item.supplier_name.strip()
    if item.is_active is not None:
        product.is_active = item.is_active

    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id if current_user else None,
        action="PRODUCT_UPDATED",
        resource_type="PRODUCT",
        resource_id=product.id,
        details_json=f'{{"name": "{product.name}", "price": {float(product.selling_price)}}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(product)

    return build_product_response(product)

@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.merchant_id == current_merchant.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    product.is_active = False

    audit = AuditLog(
        merchant_id=current_merchant.id,
        user_id=current_user.id if current_user else None,
        action="PRODUCT_ARCHIVED",
        resource_type="PRODUCT",
        resource_id=product.id,
        details_json=f'{{"sku": "{product.sku}", "name": "{product.name}"}}'
    )
    db.add(audit)
    db.commit()

    return {"message": f"Product '{product.name}' (SKU: {product.sku}) archived successfully."}

@router.post("/import-csv")
async def import_products_csv(
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

    created_count = 0
    updated_count = 0

    for row in reader:
        sku = row.get("sku", "").strip().upper()
        name = row.get("name", "").strip()
        if not sku or not name:
            continue

        category = row.get("category", "General").strip()
        unit_cost = float(row.get("unit_cost", 0.0) or 0.0)
        selling_price = float(row.get("selling_price", 10.0) or 10.0)
        current_stock = int(row.get("current_stock", 0) or 0)
        safety_stock = int(row.get("safety_stock", 10) or 10)
        lead_time_days = int(row.get("lead_time_days", 7) or 7)
        supplier_name = row.get("supplier_name", "Supplier").strip()

        existing = db.query(Product).filter(
            Product.merchant_id == current_merchant.id,
            Product.sku == sku
        ).first()

        if existing:
            existing.name = name
            existing.category = category
            existing.unit_cost = Decimal(str(unit_cost))
            existing.selling_price = Decimal(str(selling_price))
            existing.safety_stock = safety_stock
            existing.lead_time_days = lead_time_days
            existing.supplier_name = supplier_name
            updated_count += 1
        else:
            p = Product(
                merchant_id=current_merchant.id,
                sku=sku,
                name=name,
                category=category,
                unit_cost=Decimal(str(unit_cost)),
                selling_price=Decimal(str(selling_price)),
                current_stock=current_stock,
                safety_stock=safety_stock,
                lead_time_days=lead_time_days,
                supplier_name=supplier_name
            )
            db.add(p)
            created_count += 1

    db.commit()
    return {
        "message": f"CSV Import complete. {created_count} products created, {updated_count} products updated.",
        "created": created_count,
        "updated": updated_count
    }
