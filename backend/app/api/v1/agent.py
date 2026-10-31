import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_merchant
from backend.app.models.user import MerchantProfile
from backend.app.models.agent import AgentConversation
from backend.app.schemas.agent import AgentQueryRequest, AgentQueryResponse
from backend.app.agent.orchestrator import run_agent_workflow

router = APIRouter(prefix="/agent", tags=["Agentic AI"])

@router.post("/chat", response_model=AgentQueryResponse)
def chat_with_agent(
    req: AgentQueryRequest,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Submits a natural language query to the Gemini AI Agent.
    Executes controlled backend tools strictly scoped to current_merchant.
    """
    conv_id = req.conversation_id
    if not conv_id:
        new_conv = AgentConversation(
            merchant_id=current_merchant.id,
            title=f"Chat {req.query_text[:30]}"
        )
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        conv_id = new_conv.id

    result = run_agent_workflow(
        merchant_id=current_merchant.id,
        query=req.query_text,
        conversation_id=conv_id,
        db=db
    )

    return AgentQueryResponse(
        conversation_id=result["conversation_id"],
        reply_text=result["reply_text"],
        reply=result["reply_text"],
        executed_tools=result["executed_tools"],
        tool_executions=[
            {"tool_name": t["tool_name"], "arguments": t["params"], "status": t["status"]}
            for t in result["executed_tools"]
        ],
        action_suggestion=result["action_suggestion"]
    )
