from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_merchant
from backend.app.models.user import MerchantProfile
from backend.app.models.agent import AgentConversation, AgentMessage, AgentToolExecution
from backend.app.schemas.agent import (
    AgentQueryRequest,
    AgentQueryResponse,
    AgentConversationResponse,
    AgentMessageResponse,
    AgentToolExecutionResponse,
)
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
    Persists multi-turn messages and tool execution audit records.
    """
    conv_id = req.conversation_id
    if not conv_id:
        title_snippet = req.query_text[:30].strip() if req.query_text else "Strategy Session"
        new_conv = AgentConversation(
            merchant_id=current_merchant.id,
            title=f"Chat {title_snippet}"
        )
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        conv_id = new_conv.id
    else:
        # Validate conversation belongs to this merchant
        conv = db.query(AgentConversation).filter(
            AgentConversation.id == conv_id,
            AgentConversation.merchant_id == current_merchant.id
        ).first()
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

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

@router.get("/conversations", response_model=List[AgentConversationResponse])
def list_conversations(
    limit: int = Query(20, ge=1, le=100),
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    convs = db.query(AgentConversation).filter(
        AgentConversation.merchant_id == current_merchant.id
    ).order_by(AgentConversation.created_at.desc()).limit(limit).all()

    return convs

@router.get("/conversations/{conversation_id}", response_model=AgentConversationResponse)
def get_conversation_history(
    conversation_id: str,
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    conv = db.query(AgentConversation).filter(
        AgentConversation.id == conversation_id,
        AgentConversation.merchant_id == current_merchant.id
    ).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    messages = db.query(AgentMessage).filter(
        AgentMessage.conversation_id == conversation_id
    ).order_by(AgentMessage.created_at.asc()).all()

    return AgentConversationResponse(
        id=conv.id,
        merchant_id=conv.merchant_id,
        title=conv.title,
        created_at=conv.created_at,
        messages=messages
    )

@router.get("/tool-executions", response_model=List[AgentToolExecutionResponse])
def list_tool_executions(
    conversation_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_merchant: MerchantProfile = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    query = db.query(AgentToolExecution).filter(
        AgentToolExecution.merchant_id == current_merchant.id
    )

    if conversation_id:
        query = query.filter(AgentToolExecution.conversation_id == conversation_id)

    executions = query.order_by(AgentToolExecution.created_at.desc()).limit(limit).all()
    return executions
