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
from app.security import create_access_token, decode_token
from app.security import useUserSession

log = WebAPILogger(__name__)

router = APIRouter()


@router.options("/authenticate", include_in_schema=False)
async def options_authenticate():
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
) -> sch.Token:
   
    print(f"Received {request.method} request to /authenticate")
    print(f"Headers: {request.headers}")
    
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    # This endpoint is deprecated - use Google OAuth or Cognito instead
    if settings.ENVIRONMENT == "development" and not settings.USE_COGNITO and not settings.USE_GOOGLE_AUTH:
        username = "development_user"
    else:
        # In production, authentication should go through Cognito or Google OAuth
        raise errors.BadRequest("Direct authentication not supported. Please use Google OAuth or AWS Cognito.")

    try:
        user = database.get_one(db.User, username)
    except NoResultFound:
        user = db.User(username=username)

        try:
            database.add(user)
            database.commit()
        except Exception as e:
            raise errors.DatabaseError(str(e))

    user_session = sch.WebAPISession(
        username=user.username,
        sessionId=str(uuid.uuid4()),  
        rights=[]
    )

    token = create_access_token(user_session)

    log.authenticated(user_session)
    backgroundTasks.add_task(
        log_session, database=database, session=user_session, user_agent=userAgent
    )

    response.set_cookie(
        key="jenkins_session",
        value=token,
        httponly=True,
        samesite="strict" if settings.ENVIRONMENT == "production" else "lax",
        secure=settings.COOKIE_SECURE,  # Use settings value
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Use consistent timeout
        path="/",
        domain=settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None
    )

    return sch.Token(
        accessToken=token,
        tokenType="Development" if settings.ENVIRONMENT == "development" and not settings.USE_COGNITO and not settings.USE_GOOGLE_AUTH else "Cognito" if settings.USE_COGNITO else "Google" if settings.USE_GOOGLE_AUTH else "Snowflake Context"
    )


@router.post("/check-session")
async def check_session(
    response: Response,
    jenkins_session: Annotated[str | None, Cookie()] = None,
    database: useDatabase = None,
) -> sch.Token:
    if settings.ENVIRONMENT == "development" and not settings.USE_COGNITO and not settings.USE_GOOGLE_AUTH:
        username = "development_user"
        try:
            user = database.get_one(db.User, username)
        except NoResultFound:
            user = db.User(username=username)
            try:
                database.add(user)
                database.commit()
            except Exception as e:
                raise errors.DatabaseError(str(e))
        user_session = sch.WebAPISession(
            username=username,
            sessionId=str(uuid.uuid4()),
            rights=[]
        )
        api_token = create_access_token(user_session)
        response.set_cookie(
            key="jenkins_session",
            value=api_token,
            httponly=True,
            samesite="lax",  # Keep lax for dev
            secure=False,  # False for local development
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Use consistent timeout
            path="/",
            domain=settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None
        )
        return sch.Token(accessToken=api_token, tokenType="Development")

    if not jenkins_session:
        raise HTTPException(status_code=401, detail="No session found")

    try:
        session = decode_token(jenkins_session)
        new_session = sch.WebAPISession(
            username=session.username,
            sessionId=str(uuid.uuid4()),
            rights=session.rights
        )
        api_token = create_access_token(new_session)
        response.set_cookie(
            key="jenkins_session",
            value=api_token,
            httponly=True,
            samesite="strict" if settings.ENVIRONMENT == "production" else "lax",
            secure=settings.COOKIE_SECURE,  
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Use consistent timeout
            path="/",
            domain=settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None
        )
        return sch.Token(
            accessToken=api_token,
            tokenType="Cognito" if settings.USE_COGNITO else "Google" if settings.USE_GOOGLE_AUTH else "Snowflake Context"
        )
    except Exception as e:
        log.error(f"Session check failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid session")


@router.post("/logout")
async def logout_user(response: Response, session: useUserSession):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    response.delete_cookie(
        key="jenkins_session",
        path="/",
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite="strict" if settings.ENVIRONMENT == "production" else "lax",
        domain=settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None
    )
    
    return {"message": "Logged out successfully"}
