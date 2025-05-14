import uuid
import json
from typing import Annotated
from datetime import datetime, timezone
import requests

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, Body, Cookie
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session as SqlAlchemySession
from sqlalchemy import select

import app.config.db as db
import app.errors as errors
import app.schemas as sch
from app.config import settings
from app.config.db import useDatabase
from app.logging import WebAPILogger, log_session, useUserAgent
from app.security import create_access_token, decode_token

log = WebAPILogger(__name__)

router = APIRouter()


class CognitoError(Exception):
    """Exception raised for Cognito-related errors."""
    pass


async def get_user_from_token(token: str, cognito_client):
    """Get user info from Cognito token."""
    try:
        # Verify the token with Cognito
        response = cognito_client.get_user(
            AccessToken=token
        )
        
        # Extract user attributes
        user_attributes = {attr['Name']: attr['Value'] for attr in response['UserAttributes']}
        
        # Get the username (sub claim is the unique identifier)
        username = user_attributes.get('sub', response.get('Username'))
        
        return username
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        error_message = e.response.get('Error', {}).get('Message')
        
        if error_code == 'NotAuthorizedException':
            raise CognitoError(f"Invalid or expired token: {error_message}")
        else:
            raise CognitoError(f"Cognito error: {error_code} - {error_message}")


async def exchange_code_for_tokens(auth_code: str):
    """Exchange authorization code for tokens."""
    try:
        log.info(f"Exchanging authorization code for tokens")
        
        token_endpoint = f"{settings.COGNITO_DOMAIN}/oauth2/token"
        
        payload = {
            'grant_type': 'authorization_code',
            'client_id': settings.COGNITO_CLIENT_ID,
            'code': auth_code,
            'redirect_uri': settings.COGNITO_REDIRECT_URI
        }
        
        # If client secret is available, use it
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        auth = None
        if settings.COGNITO_CLIENT_SECRET:
            auth = (settings.COGNITO_CLIENT_ID, settings.COGNITO_CLIENT_SECRET)
        
        response = requests.post(
            token_endpoint,
            data=payload,
            headers=headers,
            auth=auth
        )
        
        if response.status_code != 200:
            log.error(f"Token exchange failed: {response.status_code} {response.text}")
            raise CognitoError(f"Failed to exchange code for tokens: {response.text}")
        
        tokens = response.json()
        
        # Extract identity from ID token
        import jwt
        id_token = tokens.get('id_token')
        if not id_token:
            raise CognitoError("No ID token received from Cognito")
        
        # Decode without verification - we trust Cognito since we just got the token
        try:
            claims = jwt.decode(id_token, options={"verify_signature": False})
            return tokens, claims.get('sub')  # Return all tokens and the sub claim
        except Exception as e:
            log.error(f"Failed to decode ID token: {str(e)}")
            raise CognitoError(f"Invalid ID token: {str(e)}")
        
    except Exception as e:
        if not isinstance(e, CognitoError):
            log.error(f"Error exchanging code for tokens: {str(e)}")
            raise CognitoError(f"Error exchanging code for tokens: {str(e)}")
        raise


# Define a new simple request model
class TokenRequest:
    def __init__(self, token: str):
        self.token = token


async def process_token(token: str, database: SqlAlchemySession):
    """Process a token and return username and user object"""
    log.info(f"Authenticating with Cognito token: {token[:10]}...")
    
    # Create Cognito client
    cognito_client = boto3.client(
        'cognito-idp',
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )
    
    cognito_tokens = None
    # First, try to treat it as an access token
    try:
        log.info("Trying token as access token")
        username = await get_user_from_token(token, cognito_client)
        log.info(f"Successfully verified access token for user: {username}")
        cognito_tokens = {'access_token': token}  # Store the access token
    except CognitoError as e:
        # If that fails, try to treat it as an authorization code
        if (
            "NotAuthorizedException" in str(e)
            or "Invalid token" in str(e)
            or "Invalid Access Token" in str(e)
        ):
            log.info("Access token verification failed, trying as authorization code")
            cognito_tokens, username = await exchange_code_for_tokens(token)
            log.info(f"Successfully exchanged code for tokens for user: {username}")
        else:
            raise
    
    # Get or create the user record
    try:
        user = database.get_one(db.User, username)
        log.info(f"Found existing user: {username}")
    except NoResultFound:
        # Auto-register the user if not found
        log.info(f"Registering new user: {username}")
        
        # Get the default note type
        try:
            default_note = database.execute(
                select(db.NoteDefinition)
                .where(
                    db.NoteDefinition.title == settings.DEFAULT_NOTE_DEFINITION,
                    db.NoteDefinition.username == settings.SYSTEM_USER,
                    db.NoteDefinition.inactivated.is_(None)
                )
            ).scalar_one()
            default_note_id = default_note.id
        except NoResultFound:
            default_note_id = None
            
        # Get all available note types for initial enablement
        note_types = database.execute(
            select(db.NoteDefinition.id)
            .where(
                db.NoteDefinition.username == settings.SYSTEM_USER,
                db.NoteDefinition.inactivated.is_(None)
            )
        ).scalars().all()
        
        # Create the user with default settings
        user = db.User(
            username=username,
            default_note=default_note_id,
            enabled_notes=json.dumps([nt for nt in note_types]) if note_types else None
        )
        
        try:
            database.add(user)
            database.commit()
        except Exception as e:
            log.error(f"Database error registering user: {str(e)}")
            raise errors.DatabaseError(str(e))
    
    return username, user, cognito_tokens


@router.post("/authenticate")
async def authenticate_cognito_user(
    user_agent: useUserAgent,
    db: useDatabase,
    response: Response,
    background_tasks: BackgroundTasks,
    request: dict = Body(...),
) -> sch.Token:
    """
    Validates a Cognito token or auth code and begins a session.
    First-time users are auto-registered.
    
    The token can be either:
    - An access token from Cognito
    - An authorization code from the Cognito redirect
    """
    if not request or not isinstance(request, dict) or "token" not in request:
        raise HTTPException(status_code=400, detail="Token is required")
    
    token = request["token"]
    
    try:
        username, user, cognito_tokens = await process_token(token, db)
        
        # Create a user session with UUID
        session_id = str(uuid.uuid4())
        user_session = sch.WebAPISession(
            username=user.username,  # This is the Cognito sub claim
            sessionId=session_id,    # This is a new UUID for each session
            rights=[]
        )
        
        # Generate and return an access token
        api_token = create_access_token(user_session)
        
        # Log the session
        log.authenticated(user_session)
        background_tasks.add_task(
            log_session,
            database=db,
            session=user_session,
            user_agent=user_agent
        )
        
        # Set secure HTTP-only cookies for both the API token and Cognito tokens
        response.set_cookie(
            key="jenkins_session",
            value=api_token,
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,  # Only use secure in production
            max_age=3600,  # 1 hour
            path="/"
        )
        
        # Store Cognito tokens in cookies
        if cognito_tokens:
            if 'access_token' in cognito_tokens:
                response.set_cookie(
                    key="cognito_access_token",
                    value=cognito_tokens['access_token'],
                    httponly=True,
                    samesite="lax",
                    secure=settings.COOKIE_SECURE,  # Only use secure in production
                    max_age=3600,  # 1 hour
                    path="/"
                )
            if 'refresh_token' in cognito_tokens:
                response.set_cookie(
                    key="cognito_refresh_token",
                    value=cognito_tokens['refresh_token'],
                    httponly=True,
                    samesite="lax",
                    secure=settings.COOKIE_SECURE,  # Only use secure in production
                    max_age=30 * 24 * 3600,  # 30 days
                    path="/"
                )
            if 'id_token' in cognito_tokens:
                response.set_cookie(
                    key="cognito_id_token",
                    value=cognito_tokens['id_token'],
                    httponly=True,
                    samesite="lax",
                    secure=settings.COOKIE_SECURE,  # Only use secure in production
                    max_age=3600,  # 1 hour
                    path="/"
                )
        
        log.info(f"Authentication successful for user: {username}")
        return sch.Token(accessToken=api_token, tokenType="Cognito")
    
    except CognitoError as e:
        log.error(f"Cognito authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        log.error(f"General authentication error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")


@router.post("/check-session")
async def check_session(
    response: Response,
    jenkins_session: Annotated[str | None, Cookie()] = None,
) -> sch.Token:
    """
    Checks if there's an existing valid session.
    Returns a new token if the session is valid.
    """
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
            secure=settings.COOKIE_SECURE,  # Only use secure in production
            max_age=3600,  # 1 hour
            path="/"
        )
        
        return sch.Token(accessToken=api_token, tokenType="Cognito")
    except Exception as e:
        log.error(f"Session check failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid session")


@router.post("/logout")
async def logout_user(response: Response):
    """
    Handles user logout for Cognito users.
    Clears the session cookie. Optionally, add Cognito global sign-out logic if needed.
    """
    response.delete_cookie(
        key="jenkins_session",
        path="/",
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite="lax"
    )
    # Optionally: Add Cognito global sign-out logic here if needed
    return {"message": "Logged out"} 