import uuid
from typing import Annotated

from fastapi import APIRouter, Form
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound

import app.schemas as sch
import app.services.db as db
import app.services.error_handling as errors
from app.services.logging import WebAPILogger, log_session, useUserAgent
from app.services.security import create_access_token, useSnowflakeContextUser
from app.services.db import useDatabase

log = WebAPILogger(__name__)

router = APIRouter()

@router.get("/authenticate")
async def authenticate_snowflake_user(
    snowflakeUser: useSnowflakeContextUser, 
    userAgent: useUserAgent,
    database: useDatabase
) -> sch.Token:
    # Get the user record. Auto-register the user if not found.
    try:
        user = database.execute(
            select(db.User).where(db.User.username == snowflakeUser)
        ).one()[0]
    except NoResultFound:
        user = db.User(username=snowflakeUser)

        try:
            database.add(user)
            database.commit()
        except Exception as e:
            raise errors.DatabaseError(str(e))

    # Create a user session.
    session_id = str(uuid.uuid4())
    user_session = sch.WebAPISession(username=user.username, sessionId=session_id, rights=[])
    
    # Generate and return an access token.
    token = create_access_token(user_session)

    # Log the session
    log.authenticated(user_session)
    log_session(database, user_session, userAgent)

    return sch.Token(accessToken=token, tokenType="Snowflake Context")
