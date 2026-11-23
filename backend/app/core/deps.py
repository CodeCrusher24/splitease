from typing import Generator
from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import SessionLocal

def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()