from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.services.splits import split_equal, split_exact, split_percentage, split_shares
from app.services.activity import log_activity # <-- NEW IMPORT

router = APIRouter(prefix="/groups/{group_id}/expenses", tags=["expenses"])

@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def add_expense(
    group_id: int,
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verify the user is a member of the group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, 
        GroupMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # 2. Convert money to minor units (paise/cents)
    amount_minor = int(round(payload.amount * 100))

    # 3. Calculate the splits based on the chosen strategy
    user_ids = [s.user_id for s in payload.splits]
    values = {s.user_id: s.value for s in payload.splits}
    
    try:
        if payload.split_type == "equal":
            shares = split_equal(amount_minor, user_ids)
        elif payload.split_type == "exact":
            exact_amounts = {uid: int(round(val * 100)) for uid, val in values.items()}
            shares = split_exact(amount_minor, exact_amounts)
        elif payload.split_type == "percentage":
            shares = split_percentage(amount_minor, values)
        elif payload.split_type == "shares":
            int_shares = {uid: int(val) for uid, val in values.items()}
            shares = split_shares(amount_minor, int_shares)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 4. Create the expense in the DB
    expense = Expense(
        group_id=group_id,
        paid_by=payload.paid_by,
        description=payload.description,
        amount_minor=amount_minor,
        currency="INR", 
        category=payload.category,
        split_type=payload.split_type,
        expense_date=payload.expense_date,
    )
    db.add(expense)
    db.flush() # Generate the expense ID

    # 5. Create the split records
    for uid, share_minor in shares.items():
        db_split = ExpenseSplit(
            expense_id=expense.id,
            user_id=uid,
            share_minor=share_minor
        )
        db.add(db_split)
        
    # 6. Log the activity  <-- NEW BLOCK
    log_activity(
        db=db,
        group_id=group_id,
        actor_id=current_user.id,
        action="expense_created",
        payload={
            "expense_id": expense.id,
            "description": expense.description,
            "amount_minor": expense.amount_minor
        }
    )
        
    db.commit()
    db.refresh(expense)
    
    return expense
@router.get("", response_model=list[ExpenseResponse])
def list_expenses(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verify membership
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, 
        GroupMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # 2. Fetch expenses (excluding soft-deleted ones)
    expenses = db.query(Expense).filter(
        Expense.group_id == group_id,
        Expense.deleted_at.is_(None)
    ).order_by(Expense.expense_date.desc(), Expense.created_at.desc()).all()
    
    return expenses