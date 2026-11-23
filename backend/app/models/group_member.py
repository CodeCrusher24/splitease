from datetime import datetime
from sqlalchemy import DateTime, func, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class GroupMember(Base):
    __tablename__ = "group_members"

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), default="member")
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")