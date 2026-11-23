from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, func, ForeignKey, BigInteger, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), index=True)
    paid_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    
    description: Mapped[str] = mapped_column(String(255))
    
    # CRITICAL: Money is stored as integers (paise/cents). 100.50 INR = 10050.
    amount_minor: Mapped[int] = mapped_column(BigInteger)
    
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    category: Mapped[str] = mapped_column(String(50), default="general")
    split_type: Mapped[str] = mapped_column(String(20))  # equal, exact, percentage, shares
    expense_date: Mapped[date] = mapped_column(Date)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    group = relationship("Group", back_populates="expenses")
    payer = relationship("User", back_populates="expenses_paid")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")