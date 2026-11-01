from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, model_validator

class AgentQueryRequest(BaseModel):
    query_text: Optional[str] = None
    message: Optional[str] = None
    conversation_id: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any):
        if isinstance(data, dict):
            if "message" in data and not data.get("query_text"):
                data["query_text"] = data["message"]
            elif "query_text" in data and not data.get("message"):
                data["message"] = data["query_text"]
        return data

class ToolExecutionResult(BaseModel):
    tool_name: str
    params: Dict[str, Any]
    status: str

class AgentQueryResponse(BaseModel):
    conversation_id: str
    reply_text: str
    reply: Optional[str] = None
    executed_tools: List[ToolExecutionResult]
    tool_executions: Optional[List[Dict[str, Any]]] = None
    action_suggestion: Optional[Dict[str, Any]] = None

class AgentMessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender: str
    message_text: str
    tool_calls_json: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AgentConversationResponse(BaseModel):
    id: str
    merchant_id: str
    title: str
    created_at: datetime
    messages: Optional[List[AgentMessageResponse]] = None

    model_config = ConfigDict(from_attributes=True)

class AgentToolExecutionResponse(BaseModel):
    id: str
    conversation_id: Optional[str] = None
    merchant_id: str
    tool_name: str
    input_params_json: Optional[str] = None
    result_json: Optional[str] = None
    status: str
    execution_time_ms: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
