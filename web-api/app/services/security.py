from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.services.error_handling import Unauthorized, Forbidden, BadRequest
from app.services.logging import WebAPILogger
from app.schemas import WebAPISession

log = WebAPILogger(__name__)

security_scheme = HTTPBearer(scheme_name="Snowflake Context")
useCredentials = Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)]

def create_token(data: dict, expires_delta: timedelta, secret: str) -> str:
    payload = data.copy()

    expires = datetime.now(timezone.utc) + expires_delta
    payload.update({ "exp": expires })

    encoded_jwt = jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)

    return encoded_jwt

def create_access_token(data: WebAPISession) -> str:
    return create_token(data.model_dump(), timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), settings.ACCESS_TOKEN_SECRET)

def decode_token(token: str, verify_expiry: bool = True) -> WebAPISession:    
    try:
        payload: dict = jwt.decode(token, settings.ACCESS_TOKEN_SECRET, algorithms=[settings.JWT_ALGORITHM],
            options={ "verify_exp": verify_expiry }
        )

        if "username" not in payload or "sessionId" not in payload:
            raise Unauthorized("Invalid credentials")
        
        return WebAPISession(
            username=payload["username"],
            sessionId=payload["sessionId"],
            rights=payload.get("rights") or [],
        )
    except jwt.ExpiredSignatureError:
        raise Unauthorized("Credentials expired")
    except jwt.InvalidTokenError:
        raise Unauthorized("Could not validate credentials")

async def get_snowflake_context_user(sf_context_current_user: Annotated[str | None, Header()] = None) -> str:
    if sf_context_current_user is None or len(sf_context_current_user.strip()) == 0:
        raise BadRequest("Snowflake context user is missing")
    
    return sf_context_current_user

useSnowflakeContextUser = Annotated[str, Depends(get_snowflake_context_user)]
    
async def authenticate_session(credentials: useCredentials) -> WebAPISession:
    token = credentials.credentials
    session = decode_token(token)

    return session

useUserSession = Annotated[WebAPISession, Depends(authenticate_session)]

async def authenticate_session_cookie(jenkins_session: Annotated[str, Cookie()]) -> WebAPISession:
    session = decode_token(jenkins_session)

    return session

useCookieUserSession = Annotated[WebAPISession, Depends(authenticate_session_cookie)]

async def authorize_user(rights: list[str], session: useUserSession) -> WebAPISession:
    if any(rights):
        authorized = all(r in session.rights for r in rights)

        if not authorized:
            raise Forbidden("User is not authorized to take this action")
        
    return session
