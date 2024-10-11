from fastapi import APIRouter, Depends

import app.schemas as sch
import app.services.db as db
import app.services.error_handling as errors
from app.services.db import useDatabase
from app.services.security import authenticate_user, useUserSession

router = APIRouter(dependencies=[Depends(authenticate_user)])

@router.post("/current/submit-feedback")
async def submit_feedback(
    userSession: useUserSession, 
    database: useDatabase, 
    *, 
    feedback: sch.UserFeedback
):
    try:
        record = db.UserFeedback(
            username=userSession.username,
            submitted=feedback.submitted,
            details=feedback.details,
            context="(Not Yet Implemented)",
        )

        database.add(record)
        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))
    
