from typing import Optional, List, Any, Dict
from pydantic import BaseModel, model_validator

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
