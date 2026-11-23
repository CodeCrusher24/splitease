from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.group_member import GroupMember
from app.models.settlement import Settlement
from app.models.activity_log import ActivityLog
from app.schemas.settlement import SettlementCreate, SettlementResponse, ActivityResponse
from app.services.activity import log_activity

router = APIRouter(prefix="/groups/{group_id}", tags=["settlements"])

@router.post("/settlements", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
def create_settlement(
    group_id: int,
    payload: SettlementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verify current user is a member
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # 2. Verify recipient is also a member
    recipient = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == payload.to_user
    ).first()
    if not recipient:
        raise HTTPException(status_code=400, detail="Recipient is not in this group")

    # 3. Prevent paying yourself
    if payload.to_user == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot pay yourself")

    # 4. Create the settlement record
    amount_minor = int(round(payload.amount * 100))
    settlement = Settlement(
        group_id=group_id,
        from_user=current_user.id,
        to_user=payload.to_user,
        amount_minor=amount_minor
    )
    db.add(settlement)
    db.flush()

    # 5. Log the activity
    log_activity(
        db=db,
        group_id=group_id,
        actor_id=current_user.id,
        action="settlement_created",
        payload={
            "settlement_id": settlement.id,
            "to_user": payload.to_user,
            "amount_minor": amount_minor
        }
    )

    db.commit()
    db.refresh(settlement)
    return settlement

@router.get("/activity", response_model=list[ActivityResponse])
def get_activity(
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

    # 2. Fetch logs (newest first)
    logs = db.query(ActivityLog).filter(
        ActivityLog.group_id == group_id
    ).order_by(ActivityLog.created_at.desc()).all()
    
    return logs