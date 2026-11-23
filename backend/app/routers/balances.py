from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.expense import Expense
from app.models.settlement import Settlement
from app.services.balances import calculate_net_balances
from app.services.simplify import simplify_debts

router = APIRouter(prefix="/groups/{group_id}", tags=["balances"])

@router.get("/balances")
def get_balances(
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

    # 2. Fetch members
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_ids = [m.user_id for m in members]

    # 3. Fetch expenses (with their splits) and settlements
    expenses = db.query(Expense).options(selectinload(Expense.splits)).filter(
        Expense.group_id == group_id,
        Expense.deleted_at.is_(None)
    ).all()
    
    settlements = db.query(Settlement).filter(Settlement.group_id == group_id).all()

    # 4. Convert to dictionaries for the pure math function
    exp_dicts = [{
        "paid_by": e.paid_by,
        "amount_minor": e.amount_minor,
        "splits": [{"user_id": s.user_id, "share_minor": s.share_minor} for s in e.splits]
    } for e in expenses]

    settle_dicts = [{
        "from_user": s.from_user,
        "to_user": s.to_user,
        "amount_minor": s.amount_minor
    } for s in settlements]

    # 5. Calculate
    net = calculate_net_balances(member_ids, exp_dicts, settle_dicts)
    
    return {"balances": net}

@router.get("/simplify")
def get_simplify(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # (Same membership check and data fetching as above)
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id, 
        GroupMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_ids = [m.user_id for m in members]

    expenses = db.query(Expense).options(selectinload(Expense.splits)).filter(
        Expense.group_id == group_id,
        Expense.deleted_at.is_(None)
    ).all()
    settlements = db.query(Settlement).filter(Settlement.group_id == group_id).all()

    exp_dicts = [{
        "paid_by": e.paid_by,
        "amount_minor": e.amount_minor,
        "splits": [{"user_id": s.user_id, "share_minor": s.share_minor} for s in e.splits]
    } for e in expenses]

    settle_dicts = [{
        "from_user": s.from_user,
        "to_user": s.to_user,
        "amount_minor": s.amount_minor
    } for s in settlements]

    net = calculate_net_balances(member_ids, exp_dicts, settle_dicts)
    payments = simplify_debts(net)
    
    # Format the output nicely
    result = [{"from_user": f, "to_user": t, "amount_minor": amt} for f, t, amt in payments]
    return {"payments": result}