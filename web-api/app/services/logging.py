import logging
import json
from typing import Annotated
from datetime import datetime, timezone
from http.client import responses as http_responses

from fastapi import Depends, Header
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session as SQLAlchemySession

import app.services.data as data
from app.config import settings
from app.schemas import WebAPISession

class RequestMetrics(BaseModel):
    url: str
    method: str
    status_code: int
    duration: int

class WebAPILogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.level = logging.getLevelNamesMapping()[settings.LOGGING_LEVEL.upper()]

    @staticmethod
    def __session_message(message: str, session: WebAPISession | None):
        return message if session is None else f"{message} [User: {session.username}, Session ID: {session.sessionId}]"

    def request(self, metrics: RequestMetrics, session: WebAPISession | None = None):
        status_text = http_responses.get(metrics.status_code) or "Unknown"
        message = f"{metrics.method} {metrics.url} [{metrics.status_code} {status_text}] in {metrics.duration} ms"
        self.logger.info(WebAPILogger.__session_message(message, session))

    def authenticated(self, session: WebAPISession):
        self.logger.info(WebAPILogger.__session_message("User session started", session))

    def info(self, message: str, session: WebAPISession | None = None):
        self.logger.info(WebAPILogger.__session_message(message, session))

    def debug(self, message: str, session: WebAPISession | None = None):
        self.logger.debug(WebAPILogger.__session_message(message, session))

    def warning(self, message: str, session: WebAPISession | None = None):
        self.logger.warning(WebAPILogger.__session_message(message, session))

    def error(self, message: str, session: WebAPISession | None = None):
        self.logger.error(WebAPILogger.__session_message(message, session))

    def exception(self, exception: Exception, session: WebAPISession | None = None):
        self.logger.exception(exception, { "User": session.username, "Session ID": session.sessionId } if session is not None else None)


async def get_user_agent(user_agent: Annotated[str | None, Header()] = None, jenkins_user_agent: Annotated[str | None, Header()] = None) -> str:
    return jenkins_user_agent or user_agent or ""

useUserAgent = Annotated[str, Depends(get_user_agent)]

async def get_request_id(x_request_id: Annotated[str | None, Header()] = None) -> str:
    return x_request_id or ""

useRequestId = Annotated[str, Depends(get_request_id)]

log = WebAPILogger(__name__)

def log_session(
    session: WebAPISession, 
    user_agent: str
):
    values = { 
        "session_id": session.sessionId, 
        "username": session.username,
        "started_at": datetime.now(timezone.utc),
        "user_agent": user_agent,
    }

    try:
        with SQLAlchemySession(data.db_engine) as database:
            database.execute(
                text(
                    """
                    INSERT INTO session_log (session_id, username, started_at, user_agent)
                    VALUES (:session_id, :username, :started_at, :user_agent)
                    """
                ),
                values
            )
            database.commit()
    except Exception as e:
        message = f"Error saving session log: {json.dumps(values, default=str)}; Error: {str(e)}"
        log.warning(message, session)

def log_request(
    requested_at: datetime,
    url: str, 
    method: str, 
    status_code: int, 
    duration: int, 
    request_id: str | None, 
    session: WebAPISession | None
):
    values = {
        "requested_at": requested_at,
        "url": url,
        "method": method,
        "status_code": status_code,
        "status_text": http_responses.get(status_code) or "Unknown",
        "duration": duration,
        "request_id": request_id,
        "session_id": session.sessionId if session is not None else None,
    }

    try:
        with SQLAlchemySession(data.db_engine) as database:
            database.execute(
                text(
                    """
                    INSERT INTO request_log (requested_at, url, method, status_code, status_text, duration, request_id, session_id)
                    VALUES (:requested_at, :url, :method, :status_code, :status_text, :duration, :request_id, :session_id)
                    """
                ),
                values
            )
            database.commit()
    except Exception as e:
        message = f"Error saving request log: {json.dumps(values, default=str)}; Error: {str(e)}"
        log.warning(message, session)

def log_error(
    occurred_at: datetime,
    url: str, 
    method: str, 
    status_code: int, 
    name: str, 
    message: str,
    stack_trace: str,
    error_id: str | None,
    request_id: str | None,
    session: WebAPISession | None
):
    values = {
        "occurred_at": occurred_at,
        "url": url,
        "method": method,
        "status_code": status_code,
        "status_text": http_responses.get(status_code) or "Unknown",
        "name": name,
        "message": message,
        "stack_trace": stack_trace,
        "error_id": error_id,
        "request_id": request_id,
        "session_id": session.sessionId if session is not None else None,
    }

    try:
        with SQLAlchemySession(data.db_engine) as database:
            database.execute(
                text(
                    """
                    INSERT INTO error_log (occurred_at, url, method, status_code, status_text, name, message, stack_trace, error_id, request_id, session_id)
                    VALUES (:occurred_at, :url, :method, :status_code, :status_text, :name, :message, :stack_trace, :error_id, :request_id, :session_id)
                    """
                ),
                values
            )
            database.commit()
    except Exception as e:
        message = f"Error saving error log: {json.dumps(values, default=str)}; Error: {str(e)}"
        log.warning(message, session)

def log_transcription(
    transcribed_at: datetime,
    service: str,
    audio_duration: int,
    time_to_generate: int,
    session: WebAPISession | None
):
    values = {
        "session_id": session.sessionId if session is not None else None,
        "transcribed_at": transcribed_at,
        "service": service,
        "audio_duration": audio_duration,
        "time_to_generate": time_to_generate,
    }

    try:
        with SQLAlchemySession(data.db_engine) as database:
            database.execute(
                text(
                    """
                    INSERT INTO transcription_log (session_id, transcribed_at, service, audio_duration, time_to_generate)
                    VALUES (:session_id, :transcribed_at, :service, :audio_duration, :time_to_generate)
                    """
                ),
                values
            )
            database.commit()
    except Exception as e:
        message = f"Error saving transcription log: {json.dumps(values, default=str)}; Error: {str(e)}"
        log.warning(message, session)

def log_generation(
    generated_at: datetime,
    service: str,
    model: str,
    tag: str,
    completion_tokens: int,
    prompt_tokens: int,
    time_to_generate: int,
    session: WebAPISession | None
):
    values = {
        "session_id": session.sessionId if session is not None else None,
        "generated_at": generated_at,
        "service": service,
        "model": model,
        "tag": tag,
        "completion_tokens": completion_tokens,
        "prompt_tokens": prompt_tokens,
        "time_to_generate": time_to_generate,
    }

    try:
        with SQLAlchemySession(data.db_engine) as database:
            database.execute(
                text(
                    """
                    INSERT INTO generation_log (session_id, generated_at, service, model, tag, completion_tokens, prompt_tokens, time_to_generate)
                    VALUES (:session_id, :generated_at, :service, :model, :tag, :completion_tokens, :prompt_tokens, :time_to_generate)
                    """
                ),
                values
            )
            database.commit()
    except Exception as e:
        message = f"Error saving transcription log: {json.dumps(values, default=str)}; Error: {str(e)}"
        log.warning(message, session)
