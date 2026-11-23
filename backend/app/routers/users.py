from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.group_member import GroupMember
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.settlement import Settlement

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me/stats")
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Total groups
    total_groups = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).count()

    # 2. Total expenses paid by user
    total_expenses = db.query(func.sum(Expense.amount_minor)).filter(
        Expense.paid_by == current_user.id,
        Expense.deleted_at.is_(None)
    ).scalar() or 0

    # 3. Pending settlements (approximate: sum of debts in all groups)
    # Get all groups user is in
    groups = db.query(GroupMember.group_id).filter(GroupMember.user_id == current_user.id).all()
    group_ids = [g[0] for g in groups]
    
    pending = 0
    if group_ids:
        # This is a simplified version. A full implementation would run the simplify algorithm across all groups.
        # For now, we'll just sum the negative splits (what the user owes) minus settlements paid.
        user_splits = db.query(func.sum(ExpenseSplit.share_minor)).join(Expense).filter(
            ExpenseSplit.user_id == current_user.id,
            Expense.group_id.in_(group_ids),
            Expense.deleted_at.is_(None)
        ).scalar() or 0
        
        user_paid = db.query(func.sum(Expense.amount_minor)).filter(
            Expense.paid_by == current_user.id,
            Expense.group_id.in_(group_ids),
            Expense.deleted_at.is_(None)
        ).scalar() or 0
        
        settlements_paid = db.query(func.sum(Settlement.amount_minor)).filter(
            Settlement.from_user == current_user.id,
            Settlement.group_id.in_(group_ids)
        ).scalar() or 0
        
        settlements_recv = db.query(func.sum(Settlement.amount_minor)).filter(
            Settlement.to_user == current_user.id,
            Settlement.group_id.in_(group_ids)
        ).scalar() or 0
        
        net = user_paid - user_splits + settlements_paid - settlements_recv
        pending = abs(net)

    return {
        "total_groups": total_groups,
        "total_expenses_minor": total_expenses,
        "pending_settlements_minor": pending
    }