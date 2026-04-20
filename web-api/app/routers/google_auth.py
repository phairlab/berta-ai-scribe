import uuid
import json
import requests
from datetime import datetime, timezone
from typing import Dict, Any
import traceback

from fastapi import APIRouter, BackgroundTasks, Response, Body, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from fastapi.responses import RedirectResponse

import app.config.db as db
from app.config.db import User, NoteDefinition
import app.errors as errors
import app.schemas as sch
from app.config import settings
from app.config.db import useDatabase
from app.logging import WebAPILogger, log_session, useUserAgent
from app.security import create_access_token

log = WebAPILogger(__name__)

router = APIRouter()

class GoogleAuthError(Exception):
    pass

GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_AUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"

@router.get("/google-login")
async def google_login():
    if not settings.USE_GOOGLE_AUTH:
        raise HTTPException(status_code=400, detail="Google authentication is not enabled")
        
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google client ID is not configured")
        
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    
    return RedirectResponse(url=auth_url)

async def verify_google_token(token: str) -> Dict[str, Any]:
    try:
        response = requests.get(f"{GOOGLE_TOKEN_INFO_URL}?id_token={token}")
        
        if response.status_code != 200:
            raise GoogleAuthError(f"Invalid token verification: {response.text}")
            
        token_info = response.json()
        
        if "aud" in token_info and token_info["aud"] != settings.GOOGLE_CLIENT_ID:
            raise GoogleAuthError("Token was not issued for this application")
            
        user_id = token_info.get("sub")
        if not user_id:
            raise GoogleAuthError("Token does not contain a user ID")
            
        email = token_info.get("email")
        
        return {
            "user_id": user_id,
            "email": email
        }
    except Exception as e:
        if not isinstance(e, GoogleAuthError):
            log.error(f"Error verifying Google token: {str(e)}")
            traceback.print_exc()
            raise GoogleAuthError(f"Error verifying token: {str(e)}")
        raise

async def exchange_auth_code(code: str) -> Dict[str, Any]:
    try:
        
        payload = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        debug_payload = {k: v for k, v in payload.items() if k != "client_secret"}
        print("GOOGLE OAUTH PAYLOAD:", debug_payload)
        response = requests.post(GOOGLE_AUTH_TOKEN_URL, data=payload)
        print("GOOGLE OAUTH RESPONSE:", response.status_code, response.text)
        if response.status_code != 200:
            raise GoogleAuthError(f"Failed to exchange code for tokens: {response.text}")
        tokens = response.json()
        id_token = tokens.get("id_token")
        if not id_token:
            raise GoogleAuthError("No ID token received from Google")
        # Verify the ID token and get user info
        user_info = await verify_google_token(id_token)
        return user_info
    except Exception as e:
        if not isinstance(e, GoogleAuthError):
            log.error(f"Error exchanging auth code: {str(e)}")
            traceback.print_exc()
            raise GoogleAuthError(f"Error exchanging auth code: {str(e)}")
        raise

@router.post("/authenticate-google")
async def authenticate_google_user(
    user_agent: useUserAgent,
    db: useDatabase,
    response: Response,
    background_tasks: BackgroundTasks,
    request: Dict[str, Any] = Body(...),
) -> sch.Token:
    if not request or not isinstance(request, dict) or "token" not in request:
        raise HTTPException(status_code=400, detail="Token is required")
    
    token = request["token"]
    is_auth_code = request.get("isAuthCode", False)
    
    try:
        if is_auth_code:
            user_info = await exchange_auth_code(token)
        else:
            user_info = await verify_google_token(token)
        
        username = f"google_{user_info['user_id']}"
        
        try:
            user = db.query(User).filter_by(username=username).one()
            log.info(f"Found existing user: {username}")
        except NoResultFound:
            log.info(f"Registering new user: {username}")
            
            try:
                default_note = db.query(NoteDefinition).filter(
                    NoteDefinition.title == settings.DEFAULT_NOTE_DEFINITION,
                    NoteDefinition.username == settings.SYSTEM_USER,
                    NoteDefinition.inactivated.is_(None)
                ).first()
                default_note_id = default_note.id if default_note else None
            except NoResultFound:
                default_note_id = None
                
            note_types = db.query(NoteDefinition.id).filter(
                NoteDefinition.username == settings.SYSTEM_USER,
                NoteDefinition.inactivated.is_(None)
            ).all()
            
            user = User(
                username=username,
                default_note=default_note_id,
                enabled_notes=json.dumps([nt.id for nt in note_types]) if note_types else None
            )
            
            try:
                db.add(user)
                db.commit()
            except Exception as e:
                log.error(f"Database error registering user: {str(e)}")
                traceback.print_exc()
                raise errors.DatabaseError(str(e))
        
        session_id = str(uuid.uuid4())
        user_session = sch.WebAPISession(
            username=username,
            sessionId=session_id,
            rights=[]
        )
        
        api_token = create_access_token(user_session)
        
        log.authenticated(user_session)
        background_tasks.add_task(
            log_session,
            database=db,
            session=user_session,
            user_agent=user_agent
        )
        
        response.set_cookie(
            key="jenkins_session",
            value=api_token,
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
            max_age=3600,  
            path="/"
        )
        
        log.info(f"Google authentication successful for user: {username}")
        return sch.Token(accessToken=api_token, tokenType="Google")
        
    except GoogleAuthError as e:
        log.error(f"Google authentication error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        log.error(f"General authentication error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="jenkins_session",
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        path="/"
    )
    
    return {"message": "Successfully logged out"}