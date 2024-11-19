from typing import Annotated
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends
from sqlalchemy.exc import NoResultFound

import app.schemas as sch
import app.services.db as db
import app.services.error_handling as errors
from app.services.db import useDatabase
from app.services.security import authenticate_session, useUserSession

router = APIRouter(dependencies=[Depends(authenticate_session)])

@router.get("/info")
def get_user_info(userSession: useUserSession, database: useDatabase):
    """
    Gets information and settings for the current user.
    """

    # Get the current user record.
    try:
        user = database.get_one(db.User, userSession.username)
    except NoResultFound:
        raise errors.BadRequest("User is not registered")
    
    return sch.UserInfo(username=user.username, defaultNoteType=user.default_note)

@router.put("/default-note-type")
def set_default_note_type(
    userSession: useUserSession,
    database: useDatabase,
    *,
    id: Annotated[str, Body()]):
    """
    Sets a note definition as default for the current user.
    """

    try:
        user = database.get_one(db.User, userSession.username)
    except NoResultFound:
        raise errors.BadRequest("User is not registered")
    
    user.default_note = id
    user.updated = datetime.now(timezone.utc)
    database.commit()

@router.post("/feedback")
def submit_feedback(
    userSession: useUserSession, 
    database: useDatabase, 
    *, 
    feedback: sch.UserFeedback
):
    """
    Saves user feedback.
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
    
