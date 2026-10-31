from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_merchant
from backend.app.models.user import MerchantProfile
from backend.app.models.inventory import Product, InventoryMovement, PurchaseOrderDraft, ReorderRecommendation
from backend.app.schemas.inventory import (
    StockAdjustment,
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    ReorderRecommendationResponse
)
from backend.app.ml.inventory_math import calculate_inventory_reorder

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/status")
def get_inventory_status(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    products = db.query(Product).filter(
        Product.merchant_id == current_merchant.id,
        Product.is_active == True
    ).all()

    items = []
    low_stock_count = 0
    out_of_stock_count = 0

    for p in products:
        if p.current_stock <= 0:
            st = "OUT_OF_STOCK"
            out_of_stock_count += 1
        elif p.current_stock <= p.safety_stock:
            st = "LOW_STOCK"
            low_stock_count += 1
        else:
            st = "IN_STOCK"

        items.append({
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "current_stock": p.current_stock,
            "safety_stock": p.safety_stock,
            "lead_time_days": p.lead_time_days,
            "unit_cost": p.unit_cost,
            "unit_price": p.selling_price,
            "supplier_name": p.supplier_name,
            "status": st
        })

    return {
        "summary": {
            "total_products": len(products),
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count
        },
        "items": items
    }

@router.post("/adjust-stock")
def adjust_stock(
    adj: StockAdjustment,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == adj.product_id,
        Product.merchant_id == current_merchant.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    new_stock = max(0, product.current_stock + adj.adjustment_units)
    product.current_stock = new_stock

    movement = InventoryMovement(
        merchant_id=current_merchant.id,
        product_id=product.id,
        movement_type="ADJUSTMENT",
        quantity=adj.adjustment_units,
        stock_after=new_stock,
        reason=adj.reason
    )
    db.add(movement)
    db.commit()

    return {
        "message": f"Stock updated to {new_stock} units.",
        "product_id": product.id,
        "current_stock": new_stock
    }

@router.get("/reorders")
def get_reorder_recommendations(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    products = db.query(Product).filter(
        Product.merchant_id == current_merchant.id,
        Product.is_active == True
    ).all()

    recommendations = []
    for p in products:
        rec = calculate_inventory_reorder(current_merchant.id, p.id, db)
        if rec.get("is_low_stock") and rec.get("recommended_quantity", 0) > 0:
            recommendations.append({
                "id": f"rec_{p.id}",
                "product_id": p.id,
                "product_name": p.name,
                "sku": p.sku,
                "current_stock": p.current_stock,
                "safety_stock": rec.get("safety_stock", p.safety_stock),
                "lead_time_days": p.lead_time_days,
                "recommended_quantity": rec["recommended_quantity"],
                "reasoning": rec["reasoning"],
                "urgency": rec["urgency"],
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc)
            })

    return recommendations

@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    po_in: PurchaseOrderCreate,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == po_in.product_id,
        Product.merchant_id == current_merchant.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    supplier = po_in.supplier_name or product.supplier_name
    total_amount = float(product.unit_cost * po_in.quantity)

    po = PurchaseOrderDraft(
        merchant_id=current_merchant.id,
        product_id=product.id,
        quantity=po_in.quantity,
        unit_cost=product.unit_cost,
        total_amount=total_amount,
        supplier_name=supplier,
        status="DRAFT"
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    return PurchaseOrderResponse(
        id=po.id,
        product_id=product.id,
        product_name=product.name,
        sku=product.sku,
        quantity=po.quantity,
        unit_cost=po.unit_cost,
        total_amount=po.total_amount,
        supplier_name=po.supplier_name,
        status=po.status,
        created_at=po.created_at,
        received_at=po.received_at
    )

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    pos = db.query(PurchaseOrderDraft, Product).join(
        Product, PurchaseOrderDraft.product_id == Product.id
    ).filter(
        PurchaseOrderDraft.merchant_id == current_merchant.id
    ).order_by(PurchaseOrderDraft.created_at.desc()).all()

    return [
        PurchaseOrderResponse(
            id=po.id,
            product_id=p.id,
            product_name=p.name,
            sku=p.sku,
            quantity=po.quantity,
            unit_cost=po.unit_cost,
            total_amount=po.total_amount,
            supplier_name=po.supplier_name,
            status=po.status,
            created_at=po.created_at,
            received_at=po.received_at
        )
        for po, p in pos
    ]

@router.post("/purchase-orders/{po_id}/receive")
def receive_purchase_order(
    po_id: str,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    po = db.query(PurchaseOrderDraft).filter(
        PurchaseOrderDraft.id == po_id,
        PurchaseOrderDraft.merchant_id == current_merchant.id
    ).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found.")
    if po.status == "RECEIVED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Purchase order already received.")

    product = db.query(Product).filter(Product.id == po.product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated product not found.")

    new_stock = product.current_stock + po.quantity
    product.current_stock = new_stock
    po.status = "RECEIVED"
    po.received_at = datetime.now(timezone.utc)

    # Log inventory restock movement
    movement = InventoryMovement(
        merchant_id=current_merchant.id,
        product_id=product.id,
        movement_type="RESTOCK",
        quantity=po.quantity,
        stock_after=new_stock,
        reason=f"Received PO {po.id} from {po.supplier_name}",
        reference_id=po.id
    )
    db.add(movement)
    db.commit()

    return {
        "message": f"Successfully received {po.quantity} units. Stock updated to {new_stock}.",
        "po_id": po.id,
        "new_stock": new_stock
    }
