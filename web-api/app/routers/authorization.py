import uuid

from fastapi import APIRouter, BackgroundTasks, Response
from sqlalchemy.exc import NoResultFound

import app.config.db as db
import app.errors as errors
import app.schemas as sch
from app.config import settings
from app.config.db import useDatabase
from app.logging import WebAPILogger, log_session, useUserAgent
from app.security import create_access_token, useSnowflakeContextUser

log = WebAPILogger(__name__)

router = APIRouter()


@router.get("/authenticate")
def authenticate_snowflake_user(
    snowflakeUser: useSnowflakeContextUser,
    userAgent: useUserAgent,
    database: useDatabase,
    response: Response,
    backgroundTasks: BackgroundTasks,
) -> sch.Token:
    """
    Validates the current Snowflake user and begins a session.
    First-time users are auto-registered.

    **Note:** True user authentication is handled by Snowflake prior to any
    access to this API, and so the user can safely and reliably be identified
    via a Snowflake controlled header value.  Therefore this endpoint serves
    only as session-management for the API to track use, scope requests, and
    enforce app-level restrictions.
    """
    # Get the user record.
    try:
        user = database.get_one(db.User, snowflakeUser)
    except NoResultFound:
        # Auto-register the user if not found.
        user = db.User(username=snowflakeUser)

        try:
            database.add(user)
            database.commit()
        except Exception as e:
            raise errors.DatabaseError(str(e))

    # Create a user session.
    session_id = str(uuid.uuid4())
    user_session = sch.WebAPISession(
        username=user.username, sessionId=session_id, rights=[]
    )

    # Generate and return an access token.
    token = create_access_token(user_session)

    # Log the session
    log.authenticated(user_session)
    backgroundTasks.add_task(
        log_session, database=database, session=user_session, user_agent=userAgent
    )

    # Set the http-only cookie.
    response.set_cookie(
        key="jenkins_session",
        value=token,
        httponly=True,
        samesite="strict",
        secure=(settings.ENVIRONMENT != "development"),
    )

    return sch.Token(accessToken=token, tokenType="Snowflake Context")
