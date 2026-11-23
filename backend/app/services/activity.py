from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog

def log_activity(db: Session, group_id: int, actor_id: int, action: str, payload: dict):
    """Helper to create an activity log entry."""
    log = ActivityLog(
        group_id=group_id,
        actor_id=actor_id,
        action=action,
        payload=payload
    )
    db.add(log)
    # We don't commit here; the caller's transaction will commit it.