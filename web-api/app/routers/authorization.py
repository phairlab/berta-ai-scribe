import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Response, Depends, Request, Cookie, HTTPException
from sqlalchemy.exc import NoResultFound
import boto3
from botocore.exceptions import ClientError

import app.config.db as db
import app.errors as errors
import app.schemas as sch
from app.config import settings
from app.config.db import useDatabase
from app.logging import WebAPILogger, log_session, useUserAgent
from app.security import create_access_token, useSnowflakeContextUser, decode_token
from app.security import useUserSession

log = WebAPILogger(__name__)

router = APIRouter()


@router.options("/authenticate", include_in_schema=False)
async def options_authenticate():
    """Handle OPTIONS request for CORS preflight"""
    print("Handling OPTIONS request to /authenticate")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )


@router.api_route("/authenticate", methods=["GET", "POST"])
async def authenticate_user(
    request: Request,
    userAgent: useUserAgent,
    database: useDatabase,
    response: Response,
    backgroundTasks: BackgroundTasks,
    snowflakeUser: useSnowflakeContextUser = None,
) -> sch.Token:
    """
    Validates the current user and begins a session.
    In development mode without Cognito, creates a default user if none exists.
    In production or with Cognito, requires proper authentication.
    """
    print(f"Received {request.method} request to /authenticate")
    print(f"Headers: {request.headers}")
    
    # Add CORS headers to response
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    # In development mode without Cognito, use a default user
    if settings.ENVIRONMENT == "development" and not settings.USE_COGNITO:
        username = "development_user"
    else:
        if not snowflakeUser:
            raise errors.BadRequest("Snowflake context user is missing")
        username = snowflakeUser

    # Get the user record.
    try:
        user = database.get_one(db.User, username)
    except NoResultFound:
        # Auto-register the user if not found.
        user = db.User(username=username)

        try:
            database.add(user)
            database.commit()
        except Exception as e:
            raise errors.DatabaseError(str(e))

    # Create a user session using username as session ID
    user_session = sch.WebAPISession(
        username=user.username,
        sessionId=str(uuid.uuid4()),  # Use UUID for session ID
        rights=[]
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
        samesite="lax",
        secure=settings.COOKIE_SECURE,  # Use settings value
        max_age=3600,  # 1 hour
        path="/"
    )

    return sch.Token(
        accessToken=token,
        tokenType="Development" if settings.ENVIRONMENT == "development" and not settings.USE_COGNITO else "Cognito" if settings.USE_COGNITO else "Snowflake Context"
    )


@router.post("/check-session")
async def check_session(
    response: Response,
    jenkins_session: Annotated[str | None, Cookie()] = None,
    database: useDatabase = None,
) -> sch.Token:
    """
    Checks if there's an existing valid session.
    In development mode, creates a new session if none exists.
    Returns a new token if the session is valid.
    """
    if settings.ENVIRONMENT == "development" and not settings.USE_COGNITO:
        # In development without Cognito, create a new session if none exists
        username = "development_user"
        
        # Get or create the user record
        try:
            user = database.get_one(db.User, username)
        except NoResultFound:
            user = db.User(username=username)
            try:
                database.add(user)
                database.commit()
            except Exception as e:
                raise errors.DatabaseError(str(e))
        
        # Create a new session
        user_session = sch.WebAPISession(
            username=username,
            sessionId=str(uuid.uuid4()),
            rights=[]
        )
        
        # Generate a new token
        api_token = create_access_token(user_session)
        
        # Set the new token in a cookie
        response.set_cookie(
            key="jenkins_session",
            value=api_token,
            httponly=True,
            samesite="lax",
            secure=False,  # Not secure in development
            max_age=3600,  # 1 hour
            path="/"
        )
        
        return sch.Token(accessToken=api_token, tokenType="Development")
    
    # Production mode or Cognito mode - require valid session
    if not jenkins_session:
        raise HTTPException(status_code=401, detail="No session found")
    
    try:
        # Verify the existing token
        session = decode_token(jenkins_session)
        
        # Create a new session with the same user
        new_session = sch.WebAPISession(
            username=session.username,
            sessionId=str(uuid.uuid4()),
            rights=session.rights
        )
        
        # Generate a new token
        api_token = create_access_token(new_session)
        
        # Set the new token in a cookie
        response.set_cookie(
            key="jenkins_session",
            value=api_token,
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,  # Use settings value
            max_age=3600,  # 1 hour
            path="/"
        )
        
        return sch.Token(accessToken=api_token, tokenType="Cognito" if settings.USE_COGNITO else "Snowflake Context")
    except Exception as e:
        log.error(f"Session check failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid session")


@router.post("/logout")
async def logout_user(
    response: Response,
    session: useUserSession,
) -> None:
    """
    Handles user logout.
    For Cognito users, signs out from Cognito.
    For other modes, just clears the session cookie.
    """
    try:
        # Clear the session cookie
        response.delete_cookie(
            key="jenkins_session",
            path="/",
            secure=settings.COOKIE_SECURE,
            httponly=True,
            samesite="lax"
        )

        # If using Cognito, sign out from Cognito
        if settings.USE_COGNITO and settings.COGNITO_USER_POOL_ID and settings.COGNITO_CLIENT_ID:
            try:
                # Initialize Cognito client
                cognito_client = boto3.client(
                    'cognito-idp',
                    region_name=settings.AWS_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                )

                # Sign out from Cognito
                cognito_client.global_sign_out(
                    AccessToken=session.sessionId
                )
                log.info(f"User {session.username} signed out from Cognito")
            except ClientError as e:
                log.error(f"Error signing out from Cognito: {str(e)}")
                # Continue with logout even if Cognito signout fails
            except Exception as e:
                log.error(f"Unexpected error during Cognito signout: {str(e)}")
                # Continue with logout even if Cognito signout fails

    except Exception as e:
        log.error(f"Error during logout: {str(e)}")
        raise HTTPException(status_code=500, detail="Logout failed")

    return None
