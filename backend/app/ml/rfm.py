import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any, List
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sqlalchemy.orm import Session
from backend.app.models.transaction import Customer, Transaction
from backend.app.models.analytics import CustomerSegment, CustomerSegmentAssignment

def calculate_rfm_segments(merchant_id: str, db: Session) -> Dict[str, Any]:
    """
    Computes genuine RFM customer segmentation using Scikit-learn K-Means.
    Enforces strict insufficient-data boundaries: requires at least 4 customers with transaction history.
    """
    customers = db.query(Customer).filter(Customer.merchant_id == merchant_id).all()
    if len(customers) < 4:
        return {
            "status": "INSUFFICIENT_DATA",
            "customer_count": len(customers),
            "required_count": 4,
            "message": f"Insufficient customer records for clustering. Minimum 4 distinct customers required (currently {len(customers)}).",
            "segments": []
        }

    now = datetime.now(timezone.utc)
    records = []
    for c in customers:
        if c.last_purchase_at:
            recency = max(0, (now - c.last_purchase_at.replace(tzinfo=timezone.utc if c.last_purchase_at.tzinfo is None else None)).days)
        else:
            recency = 365
        records.append({
            "customer_id": c.id,
            "email": c.email,
            "recency": recency,
            "frequency": max(1, c.order_count),
            "monetary": max(0.01, c.total_spend)
        })

    df = pd.DataFrame(records)

    # Log transformation to handle monetary/frequency skewness
    df["log_r"] = np.log1p(df["recency"])
    df["log_f"] = np.log1p(df["frequency"])
    df["log_m"] = np.log1p(df["monetary"])

    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(df[["log_r", "log_f", "log_m"]])

    k = min(4, len(df))
    kmeans = KMeans(n_clusters=k, init="k-means++", n_init=10, random_state=42)
    df["cluster"] = kmeans.fit_predict(scaled_features)

    # Silhouette score
    sil_score = 0.0
    if len(df) > k:
        try:
            sil_score = float(silhouette_score(scaled_features, df["cluster"]))
        except Exception:
            sil_score = 0.0

    # Sort clusters by average monetary spend descending
    cluster_stats = df.groupby("cluster").agg(
        avg_m=("monetary", "mean"),
        avg_f=("frequency", "mean"),
        avg_r=("recency", "mean"),
        count=("customer_id", "count")
    ).sort_values(by="avg_m", ascending=False).reset_index()

    segment_labels = [
        {"name": "VIP Customers", "color": "#6366F1", "desc": "Top spenders with high repeat purchasing frequency."},
        {"name": "Loyal Shoppers", "color": "#F59E0B", "desc": "Steady, reliable repeat customers with consistent spend."},
        {"name": "Promising / Returning", "color": "#10B981", "desc": "Recent repeat shoppers with high growth potential."},
        {"name": "New / At-Risk", "color": "#3B82F6", "desc": "Recent first-time shoppers or accounts with longer inactivity."}
    ]

    total_customers = len(df)
    results = []

    # Clear old assignments for this merchant
    db.query(CustomerSegmentAssignment).filter(CustomerSegmentAssignment.merchant_id == merchant_id).delete()
    db.query(CustomerSegment).filter(CustomerSegment.merchant_id == merchant_id).delete()
    db.commit()

    for idx, row in cluster_stats.iterrows():
        label_info = segment_labels[min(idx, len(segment_labels) - 1)]
        share_pct = round((row["count"] / total_customers) * 100.0, 1)

        seg = CustomerSegment(
            merchant_id=merchant_id,
            name=label_info["name"],
            description=label_info["desc"],
            customer_count=int(row["count"]),
            percentage=float(share_pct),
            avg_spend=round(float(row["avg_m"]), 2),
            avg_recency_days=int(row["avg_r"]),
            color=label_info["color"]
        )
        db.add(seg)
        db.flush()

        # Add customer assignments
        cluster_customers = df[df["cluster"] == row["cluster"]]
        for _, cust_row in cluster_customers.iterrows():
            assignment = CustomerSegmentAssignment(
                merchant_id=merchant_id,
                customer_id=cust_row["customer_id"],
                segment_id=seg.id,
                recency_days=int(cust_row["recency"]),
                frequency_count=int(cust_row["frequency"]),
                monetary_total=float(cust_row["monetary"]),
                r_score=1 if cust_row["recency"] > 90 else 3,
                f_score=min(5, int(cust_row["frequency"])),
                m_score=min(5, int(cust_row["monetary"] / 50) + 1)
            )
            db.add(assignment)

        results.append({
            "id": seg.id,
            "name": seg.name,
            "description": seg.description,
            "customer_count": seg.customer_count,
            "percentage": seg.percentage,
            "avg_spend": seg.avg_spend,
            "avg_recency_days": seg.avg_recency_days,
            "color": seg.color
        })

    db.commit()

    return {
        "status": "SUFFICIENT",
        "silhouette_score": round(sil_score, 3),
        "total_customers": total_customers,
        "segments": results
    }
