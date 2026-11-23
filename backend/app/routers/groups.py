from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.group_member import GroupMember
from app.schemas.group import (
    GroupCreate, GroupResponse, GroupDetailResponse, 
    MemberAdd, GroupMemberResponse
)

router = APIRouter(prefix="/groups", tags=["groups"])

@router.post("", response_model=GroupDetailResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # <--- PROTECTED!
):
    # 1. Create the group
    group = Group(
        name=payload.name,
        description=payload.description,
        currency=payload.currency,
        created_by=current_user.id,
    )
    db.add(group)
    db.flush()  # Flushes to DB so group.id is generated, but doesn't commit yet
    
    # 2. Automatically add the creator as an Admin member
    member = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(member)
    db.commit()
    db.refresh(group)
    
    # 3. Build the response
    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        currency=group.currency,
        created_by=group.created_by,
        created_at=group.created_at,
        archived=group.archived,
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
    # Query groups where the current user is a member
    groups = (
        db.query(Group)
        .join(GroupMember)
        .filter(GroupMember.user_id == current_user.id)
        .all()
    )
    return groups

@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verify group exists and user is a member
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    # 2. Fetch all members with their user details
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
        members=member_list
    )

@router.post("/{group_id}/members", status_code=status.HTTP_201_CREATED)
def add_member(
    group_id: int,
    payload: MemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verify current user is an admin of this group
    admin_check = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin"
    ).first()
    
    if not admin_check:
        raise HTTPException(status_code=403, detail="Only admins can add members")
        
    # 2. Find the user to add by email
    new_user = db.query(User).filter(User.email == payload.email).first()
    if not new_user:
        raise HTTPException(status_code=404, detail="User with this email not found")
        
    # 3. Check if they are already in the group
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == new_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
        
    # 4. Add them
    new_member = GroupMember(
        group_id=group_id,
        user_id=new_user.id,
        role="member"  # New people are regular members
    )
    db.add(new_member)
    db.commit()
    
    return {"message": f"Successfully added {new_user.name} to the group"}