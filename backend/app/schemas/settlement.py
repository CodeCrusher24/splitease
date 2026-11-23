from datetime import datetime
from pydantic import BaseModel, Field

class SettlementCreate(BaseModel):
    to_user: int
    amount: float = Field(..., gt=0)  # e.g. 46.66

class SettlementResponse(BaseModel):
    id: int
    group_id: int
    from_user: int
    to_user: int
    amount_minor: int
    created_at: datetime
    
    model_config = {"from_attributes": True}

class ActivityResponse(BaseModel):
    id: int
    action: str
    actor_id: int
    payload: dict
    created_at: datetime
    
    model_config = {"from_attributes": True}