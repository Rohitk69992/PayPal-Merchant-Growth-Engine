import math
import numpy as np
from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.inventory import Product, DailySale

def calculate_inventory_reorder(merchant_id: str, product_id: str, db: Session) -> Dict[str, Any]:
    """
    Deterministic business logic for inventory replenishment.
    ROP = Lead-Time Demand + Safety Stock
    """
    product = db.query(Product).filter(Product.id == product_id, Product.merchant_id == merchant_id).first()
    if not product:
        return {"error": "Product not found"}

    sales = db.query(DailySale).filter(
        DailySale.product_id == product_id,
        DailySale.merchant_id == merchant_id
    ).all()

    lead_time_days = product.lead_time_days
    current_stock = product.current_stock

    if len(sales) < 3:
        # Fallback to configured safety stock
        safety_stock = product.safety_stock
        reorder_point = safety_stock
        is_low_stock = current_stock <= reorder_point
        recommended_quantity = max(10, (safety_stock * 2) - current_stock) if is_low_stock else 0
        urgency = "HIGH" if current_stock == 0 else "MEDIUM" if is_low_stock else "LOW"

        return {
            "product_id": product.id,
            "product_name": product.name,
            "sku": product.sku,
            "current_stock": current_stock,
            "lead_time_days": lead_time_days,
            "safety_stock": safety_stock,
            "reorder_point": reorder_point,
            "is_low_stock": is_low_stock,
            "recommended_quantity": recommended_quantity,
            "urgency": urgency,
            "reasoning": f"Current stock ({current_stock}) is below safety threshold ({safety_stock}). Lead time is {lead_time_days} days."
        }

    units = [s.units_sold for s in sales]
    daily_avg = float(np.mean(units))
    daily_std = float(np.std(units)) if len(units) > 1 else 1.0

    # Safety Stock formula (95% service level, Z = 1.65, assuming lead time variability sigma_L = 1 day)
    Z = 1.65
    sigma_D = max(0.5, daily_std)
    sigma_L = 1.0
    safety_stock = int(math.ceil(Z * math.sqrt((lead_time_days * (sigma_D ** 2)) + ((daily_avg ** 2) * (sigma_L ** 2)))))
    safety_stock = max(product.safety_stock, safety_stock)

    lead_time_demand = int(math.ceil(daily_avg * lead_time_days))
    reorder_point = lead_time_demand + safety_stock

    is_low_stock = current_stock <= reorder_point
    # 30-day review period coverage
    target_inventory = int(math.ceil(daily_avg * (lead_time_days + 30) + safety_stock))
    recommended_quantity = max(0, target_inventory - current_stock) if is_low_stock else 0

    if current_stock == 0:
        urgency = "CRITICAL"
    elif current_stock <= safety_stock:
        urgency = "HIGH"
    elif current_stock <= reorder_point:
        urgency = "MEDIUM"
    else:
        urgency = "LOW"

    return {
        "product_id": product.id,
        "product_name": product.name,
        "sku": product.sku,
        "current_stock": current_stock,
        "lead_time_days": lead_time_days,
        "safety_stock": safety_stock,
        "lead_time_demand": lead_time_demand,
        "reorder_point": reorder_point,
        "is_low_stock": is_low_stock,
        "recommended_quantity": recommended_quantity,
        "urgency": urgency,
        "reasoning": f"Based on {daily_avg:.1f} avg daily units and {lead_time_days}-day supplier lead time, Reorder Point is {reorder_point} units. Stock is {'below ROP' if is_low_stock else 'healthy'}."
    }
