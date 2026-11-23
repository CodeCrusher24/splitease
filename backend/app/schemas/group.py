from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=255)
    currency: str = Field("INR", min_length=3, max_length=3)

class MemberAdd(BaseModel):
    email: EmailStr

class GroupMemberResponse(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    role: str

    model_config = {"from_attributes": True}

class GroupResponse(BaseModel):
    id: int
    name: str
    description: str | None
    currency: str
    created_by: int
    created_at: datetime
    archived: bool

    model_config = {"from_attributes": True}

class GroupDetailResponse(GroupResponse):
    members: list[GroupMemberResponse] = []