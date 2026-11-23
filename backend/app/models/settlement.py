from datetime import datetime
from sqlalchemy import DateTime, func, ForeignKey, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Settlement(Base):
    __tablename__ = "settlements"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), index=True)
    from_user: Mapped[int] = mapped_column(ForeignKey("users.id"))
    to_user: Mapped[int] = mapped_column(ForeignKey("users.id"))
    amount_minor: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    group = relationship("Group")