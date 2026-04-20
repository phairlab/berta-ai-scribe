import json
from datetime import datetime, timezone
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Body, Depends
from sqlalchemy.exc import NoResultFound

import app.config.db as db
import app.errors as errors
import app.schemas as sch
from app.config.db import useDatabase
from app.logging import log_data_change
from app.security import authenticate_session, useUserSession
from app.utility.conversion import ConvertToSchema

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

    return ConvertToSchema.user_info(user)


@router.put("/default-note-type", tags=["Note Definitions"])
def set_default_note_type(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    id: Annotated[str, Body()]
):
    """
    Sets a note definition as default for the current user.
    """

    try:
        user = database.get_one(db.User, userSession.username)
    except NoResultFound:
        raise errors.BadRequest("User is not registered")

    user.default_note = id
    user.updated = datetime.now(timezone.utc).astimezone()
    database.commit()

    # Record the change.
    backgroundTasks.add_task(
        log_data_change,
        database=database,
        session=userSession,
        changed=user.updated,
        entity_type="USER",
        change_type="MODIFIED",
        entity_id=user.username,
    )


@router.put("/enabled-note-types", tags=["Note Definitions"])
def set_enabled_note_types(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    noteTypes: Annotated[list[str], Body()]
):
    """
    Sets the enabled note types for the current user.
    """

    try:
        user = database.get_one(db.User, userSession.username)
    except NoResultFound:
        raise errors.BadRequest("User is not registered")

    user.enabled_notes = json.dumps(noteTypes)
    user.updated = datetime.now(timezone.utc).astimezone()
    database.commit()

    # Record the change.
    backgroundTasks.add_task(
        log_data_change,
        database=database,
        session=userSession,
        changed=user.updated,
        entity_type="USER",
        change_type="MODIFIED",
        entity_id=user.username,
    )


@router.post("/feedback", tags=["Feedback"])
def submit_feedback(
    userSession: useUserSession, database: useDatabase, *, feedback: sch.UserFeedback
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
