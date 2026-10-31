import json
import time
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.models.agent import AgentConversation, AgentMessage, AgentToolExecution
from backend.app.agent.tools import (
    tool_get_merchant_overview,
    tool_get_inventory_status,
    tool_calculate_reorder,
    tool_get_customer_segments,
    tool_generate_campaign_draft
)

def run_agent_workflow(merchant_id: str, query: str, conversation_id: str, db: Session) -> Dict[str, Any]:
    """
    Orchestrates the Agentic AI assistant with guaranteed grounding in backend tools.
    Zero hallucination of financial or inventory metrics.
    """
    t0 = time.time()
    q_lower = query.lower()

    executed_tools = []
    action_suggestion = None
    reply_text = ""

    # 1. Intent Detection & Tool Execution
    if any(k in q_lower for k in ["inventory", "stock", "reorder", "replenish"]):
        inv_data = tool_get_inventory_status(merchant_id, db)
        executed_tools.append({
            "tool_name": "get_inventory_status",
            "params": {"merchant_id": merchant_id},
            "status": "SUCCESS"
        })

        if inv_data.get("status") == "EMPTY":
            reply_text = "You currently have no products tracked in your catalog. Please add products with SKUs, current stock, and safety thresholds to enable inventory recommendations."
            action_suggestion = {"label": "Add Your First Product", "route": "/products"}
        else:
            items = inv_data.get("items", [])
            low_stock_items = [i for i in items if i["status"] in ["LOW_STOCK", "OUT_OF_STOCK"]]
            if low_stock_items:
                target_prod = low_stock_items[0]
                reorder_calc = tool_calculate_reorder(merchant_id, target_prod["product_id"], db)
                executed_tools.append({
                    "tool_name": "calculate_reorder_recommendation",
                    "params": {"product_id": target_prod["product_id"]},
                    "status": "SUCCESS"
                })

                rec_units = reorder_calc.get("recommended_quantity", 0)
                reply_text = (
                    f"**Inventory Alert:** You have {len(low_stock_items)} item(s) approaching or below threshold.\n\n"
                    f"- **{target_prod['name']}** (SKU: `{target_prod['sku']}`): Current stock is **{target_prod['current_stock']} units** (Safety Stock: {target_prod['safety_stock']}).\n"
                    f"- Supplier lead time: **{target_prod['lead_time_days']} days**.\n"
                    f"- Recommended Replenishment: **{rec_units} units**.\n\n"
                    f"*{reorder_calc.get('reasoning')}*"
                )
                action_suggestion = {
                    "label": f"Review Reorder for {target_prod['name']}",
                    "route": "/inventory",
                    "productId": target_prod["product_id"],
                    "suggestedUnits": rec_units
                }
            else:
                reply_text = f"Your inventory is currently healthy across all {len(items)} cataloged product(s). No immediate stockout risks detected based on your configured reorder points."
                action_suggestion = {"label": "View Inventory Status", "route": "/inventory"}

    elif any(k in q_lower for k in ["customer", "segment", "rfm", "who buys", "audience"]):
        seg_data = tool_get_customer_segments(merchant_id, db)
        executed_tools.append({
            "tool_name": "get_customer_segments",
            "params": {"merchant_id": merchant_id},
            "status": "SUCCESS"
        })

        if seg_data.get("status") == "INSUFFICIENT_DATA":
            reply_text = f"Customer intelligence currently has insufficient history: {seg_data.get('message')}. Record more customer transactions or connect PayPal to unlock automated RFM clustering."
            action_suggestion = {"label": "Record Sales", "route": "/sales"}
        else:
            segs = seg_data.get("segments", [])
            seg_bullets = "\n".join([f"- **{s['name']}** ({s['percentage']}% of buyers): Avg Spend **${s['avg_spend']}**, Avg Recency {s['avg_recency_days']} days." for s in segs])
            reply_text = f"Here is your RFM customer behavioral breakdown across {seg_data.get('total_customers', len(segs))} customers:\n\n{seg_bullets}\n\nWould you like me to draft a targeted retention campaign for one of these groups?"
            action_suggestion = {"label": "Explore Marketing Insights", "route": "/marketing"}

    elif any(k in q_lower for k in ["campaign", "marketing", "promotion", "discount", "email"]):
        draft_data = tool_generate_campaign_draft(merchant_id, "New / At-Risk", db)
        executed_tools.append({
            "tool_name": "generate_campaign_draft",
            "params": {"target_segment": "New / At-Risk"},
            "status": "SUCCESS"
        })

        reply_text = (
            f"I have drafted a targeted campaign concept:\n\n"
            f"- **Target Cohort:** {draft_data['target_segment']}\n"
            f"- **Subject Line:** {draft_data['suggested_email_subject']}\n"
            f"- **Coupon Code:** `{draft_data['discount_code']}` ({draft_data['discount_pct']}% Off)\n\n"
            f"*{draft_data['suggested_body_copy']}*\n\n"
            f"You can review, edit and save this draft in your Marketing section."
        )
        action_suggestion = {"label": "Open Campaign Creator", "route": "/marketing"}

    else:
        overview = tool_get_merchant_overview(merchant_id, db)
        executed_tools.append({
            "tool_name": "get_merchant_overview",
            "params": {"merchant_id": merchant_id},
            "status": "SUCCESS"
        })

        reply_text = (
            f"Here is your verified business status for **{overview['business_name']}**:\n\n"
            f"- **Gross Revenue:** ${overview['total_revenue']:.2f} {overview['currency']}\n"
            f"- **Completed Transactions:** {overview['completed_transactions']}\n"
            f"- **Catalog Products:** {overview['active_catalog_products']} items\n"
            f"- **Unique Customers:** {overview['tracked_customers']}\n"
            f"- **PayPal Connection:** {'Connected' if overview['paypal_connected'] else 'Not Connected'}\n\n"
            f"How can I help you grow today? You can ask about inventory replenishment, customer RFM cohorts, or campaign ideas."
        )

    # 2. Persist audit logs and conversation history
    duration_ms = int((time.time() - t0) * 1000)

    # Save to agent tables
    msg_user = AgentMessage(
        conversation_id=conversation_id,
        sender="user",
        message_text=query
    )
    msg_agent = AgentMessage(
        conversation_id=conversation_id,
        sender="agent",
        message_text=reply_text,
        tool_calls_json=json.dumps(executed_tools)
    )
    db.add(msg_user)
    db.add(msg_agent)

    for tool in executed_tools:
        execution_record = AgentToolExecution(
            conversation_id=conversation_id,
            merchant_id=merchant_id,
            tool_name=tool["tool_name"],
            input_params_json=json.dumps(tool["params"]),
            result_json=json.dumps({"status": tool["status"]}),
            status="SUCCESS",
            execution_time_ms=duration_ms
        )
        db.add(execution_record)

    db.commit()

    return {
        "conversation_id": conversation_id,
        "reply_text": reply_text,
        "executed_tools": executed_tools,
        "action_suggestion": action_suggestion
    }
