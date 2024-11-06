from uuid import uuid4

from fastapi import APIRouter, Depends

import app.schemas as sch
import app.services.db as db
import app.services.error_handling as errors
from app.services.db import useDatabase
from app.services.security import authenticate_user, useUserSession

router = APIRouter(dependencies=[Depends(authenticate_user)])

@router.post("/current/submit-feedback")
def submit_feedback(
    userSession: useUserSession, 
    database: useDatabase, 
    *, 
    feedback: sch.UserFeedback
):
    """
    Saves new user feedback.
    """
    
    try:
        record = db.UserFeedback(
            id=str(uuid4()),
            username=userSession.username,
            submitted=feedback.submitted,
            details=feedback.details,
            session_id=userSession.sessionId,
        )

        database.add(record)
        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))
    
