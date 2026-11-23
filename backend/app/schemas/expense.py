from datetime import date, datetime
from pydantic import BaseModel, Field, model_validator

class SplitInput(BaseModel):
    user_id: int
    value: float | int

class ExpenseCreate(BaseModel):
    description: str = Field(..., max_length=255)
    amount: float = Field(..., gt=0)  # In standard currency, e.g., 100.50
    paid_by: int
    category: str = "general"
    split_type: str = Field(..., pattern="^(equal|exact|percentage|shares)$")
    splits: list[SplitInput]
    expense_date: date

    @model_validator(mode="after")
    def check_splits_not_empty(self):
        if not self.splits:
            raise ValueError("Splits cannot be empty")
        return self

class ExpenseSplitResponse(BaseModel):
    user_id: int
    share_minor: int
    model_config = {"from_attributes": True}

class ExpenseResponse(BaseModel):
    id: int
    group_id: int
    paid_by: int
    description: str
    amount_minor: int
    currency: str
    category: str
    split_type: str
    expense_date: date
    created_at: datetime
    splits: list[ExpenseSplitResponse] = []
    
    model_config = {"from_attributes": True}