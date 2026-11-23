from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.settlement import Settlement
from app.schemas.group import (
    GroupCreate, GroupResponse, GroupDetailResponse, 
    MemberAdd, GroupMemberResponse
)
from app.services.activity import log_activity

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupDetailResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = Group(
        name=payload.name,
        description=payload.description,
        currency=payload.currency,
        created_by=current_user.id,
    )
    db.add(group)
    db.flush()
    
    member = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(member)
    
    log_activity(
        db=db,
        group_id=group.id,
        actor_id=current_user.id,
        action="group_created",
        payload={"name": group.name}
    )
    
    db.commit()
    db.refresh(group)
    
    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        currency=group.currency,
        created_by=group.created_by,
        created_at=group.created_at,
        archived=group.archived,
        member_count=1,
        members=[GroupMemberResponse(
            user_id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            role="admin"
        )]
    )


@router.get("", response_model=list[GroupResponse])
def list_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    groups = (
        db.query(Group)
        .join(GroupMember)
        .filter(GroupMember.user_id == current_user.id)
        .all()
    )
    # Attach member count
    result = []
    for group in groups:
        count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
        resp = GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            currency=group.currency,
            created_by=group.created_by,
            created_at=group.created_at,
            archived=group.archived,
            member_count=count
        )
        result.append(resp)
    return result


@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    members = (
        db.query(GroupMember)
        .join(User)
        .filter(GroupMember.group_id == group_id)
        .all()
    )
    
    member_list = [
        GroupMemberResponse(
            user_id=m.user.id, name=m.user.name, email=m.user.email, role=m.role
        ) for m in members
    ]
    
    return GroupDetailResponse(
        id=group.id, name=group.name, description=group.description,
        currency=group.currency, created_by=group.created_by,
        created_at=group.created_at, archived=group.archived,
        member_count=len(member_list),
        members=member_list
    )


@router.post("/{group_id}/members", status_code=status.HTTP_201_CREATED)
def add_member(
    group_id: int,
    payload: MemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member_check = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member_check:
        raise HTTPException(status_code=403, detail="Only group members can add people")
        
    new_user = db.query(User).filter(User.email == payload.email).first()
    if not new_user:
        raise HTTPException(status_code=404, detail="User with this email not found")
        
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == new_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
        
    new_member = GroupMember(
        group_id=group_id,
        user_id=new_user.id,
        role="member"
    )
    db.add(new_member)
    
    log_activity(
        db=db,
        group_id=group_id,
        actor_id=current_user.id,
        action="member_added",
        payload={"new_user_id": new_user.id, "new_user_name": new_user.name}
    )
    
    db.commit()
    
    return {"message": f"Successfully added {new_user.name} to the group"}


@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_check = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin"
    ).first()
    
    if not admin_check:
        raise HTTPException(status_code=403, detail="Only admins can remove members")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself")

    member_to_remove = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()

    if not member_to_remove:
        raise HTTPException(status_code=404, detail="Member not found in group")

    removed_user = db.query(User).filter(User.id == user_id).first()
    removed_name = removed_user.name if removed_user else "Unknown"

    db.delete(member_to_remove)
    
    log_activity(
        db=db,
        group_id=group_id,
        actor_id=current_user.id,
        action="member_removed",
        payload={"removed_user_id": user_id, "removed_user_name": removed_name}
    )
    
    db.commit()
    return {"message": "Member removed successfully"}


@router.post("/{group_id}/leave", status_code=status.HTTP_200_OK)
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Creators cannot leave
    if group.created_by == current_user.id:
        raise HTTPException(status_code=400, detail="Group creators cannot leave.")

    # Check user's balance in this group
    paid = db.query(func.sum(Expense.amount_minor)).filter(
        Expense.group_id == group_id,
        Expense.paid_by == current_user.id,
        Expense.deleted_at.is_(None)
    ).scalar() or 0

    owed = db.query(func.sum(ExpenseSplit.share_minor)).join(Expense).filter(
        ExpenseSplit.user_id == current_user.id,
        Expense.group_id == group_id,
        Expense.deleted_at.is_(None)
    ).scalar() or 0

    settlements_paid = db.query(func.sum(Settlement.amount_minor)).filter(
        Settlement.group_id == group_id,
        Settlement.from_user == current_user.id
    ).scalar() or 0

    settlements_recv = db.query(func.sum(Settlement.amount_minor)).filter(
        Settlement.group_id == group_id,
        Settlement.to_user == current_user.id
    ).scalar() or 0

    net = paid - owed + settlements_paid - settlements_recv

    if net != 0:
        raise HTTPException(status_code=400, detail="You cannot leave until your balance is settled.")

    db.delete(member)
    log_activity(
        db=db,
        group_id=group_id,
        actor_id=current_user.id,
        action="member_removed",
        payload={
            "removed_user_id": current_user.id,
            "removed_user_name": current_user.name,
            "reason": "left_group"
        }
    )
    db.commit()
    return {"message": "Successfully left the group"}