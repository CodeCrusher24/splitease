from sqlalchemy import ForeignKey, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id: Mapped[int] = mapped_column(primary_key=True)
    expense_id: Mapped[int] = mapped_column(ForeignKey("expenses.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    
    # How much of the expense this specific user owes (in minor units)
    share_minor: Mapped[int] = mapped_column(BigInteger)

    expense = relationship("Expense", back_populates="splits")
    user = relationship("User")