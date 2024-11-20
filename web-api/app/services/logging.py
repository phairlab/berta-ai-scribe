import logging
from typing import Annotated
from datetime import datetime, timezone
from uuid import uuid4
from http.client import responses as http_responses

from fastapi import Depends, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session as SQLAlchemySession

import app.services.snowflake as snowflake
import app.services.db as db
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

def log_session(database: db.SQLAlchemySession, session: WebAPISession, user_agent: str):
    """Records the initiation of a user session to the database."""

    try:
        session_record = db.SessionRecord(session_id=session.sessionId, username=session.username, started=datetime.now(timezone.utc), user_agent=user_agent)

        database.add(session_record)
        database.commit()
    except Exception as e:
        message = f"Failed to save session log: {str(session_record)}; Error: {str(e)}"
        log.warning(message, session)

def log_error(
    occurred: datetime, name: str,  message: str, stack_trace: str,
    *, error_id: str | None = None, request_id: str | None = None, session: WebAPISession | None = None,
):
    """Saves the record of an exception."""
    
    error_record = db.ErrorRecord(
        error_id=error_id if error_id is not None else str(uuid4()),
        occurred=occurred, name=name, message=message, stack_trace=stack_trace,
        request_id=request_id, session_id=session.sessionId if session is not None else None,
    )

    try:
        with SQLAlchemySession(snowflake.db_engine) as database:
            database.add(error_record)
            database.commit()
    except Exception as e:
        message = f"Failed to save error log: {str(error_record)}; Error: {str(e)}"
        log.warning(message, session)

def log_request(
    request_id: str | None, requested: datetime, url: str, method: str, status_code: int, duration: int,
    *, session: WebAPISession | None = None
):
    """Saves the record of a request."""

    request_record = db.RequestRecord(
        request_id=request_id if request_id is not None else str(uuid4()),
        requested=requested, url=url, method=method, status_code=status_code,
        status_text=http_responses.get(status_code) or "Unknown",
        duration=duration, session_id=session.sessionId if session is not None else None,
    )

    try:
        with SQLAlchemySession(snowflake.db_engine) as database:
            database.add(request_record)
            database.commit()
    except Exception as e:
        message = f"Failed to save request log: {str(request_record)}; Error: {str(e)}"
        log.warning(message, session)

def log_audio_conversion(
    database: db.SQLAlchemySession, recording_id: str, started: datetime, time: int,
    original_media_type: str | None,
    original_file_size: str | None,
    converted_media_type: str | None,
    converted_file_size: str | None,
    *,
    error_id: str | None = None, session: WebAPISession | None = None,
):
    """Saves a record of an audio conversion task."""

    audio_conversion_task = db.AudioConversionTask(
        task_id=str(uuid4()), recording_id=recording_id, started=started, time=time,
        original_media_type=original_media_type,
        original_file_size=original_file_size,
        converted_media_type=converted_media_type,
        converted_file_size=converted_file_size,
        error_id=error_id, session_id=session.sessionId if session is not None else None,
    )

    try:
        database.add(audio_conversion_task)
        database.commit()
    except Exception as e:
        message = f"Failed to save audio conversion log: {str(audio_conversion_task)}; Error: {str(e)}"
        log.warning(message, session)

def log_transcription(
    database: db.SQLAlchemySession, recording_id: str, started: datetime, time: int, service: str,
    *, error_id: str | None = None, session: WebAPISession | None = None,
):
    """Saves a record of a transcription task."""

    transcription_task = db.TranscriptionTask(
        task_id=str(uuid4()), recording_id=recording_id, started=started, time=time, service=service,
        error_id=error_id, session_id=session.sessionId if session is not None else None,
    )

    try:
        database.add(transcription_task)
        database.commit()
    except Exception as e:
        message = f"Failed to save transcription log: {str(transcription_task)}; Error: {str(e)}"
        log.warning(message, session)

def log_generation(
    database: db.SQLAlchemySession, record_id: str, task_type: str, started: datetime,
    time: int, service: str, model: str, completion_tokens: int, prompt_tokens: int,
    *, error_id: str | None = None, session: WebAPISession | None = None,
):
    """Saves a record of a generative AI task."""

    generation_task = db.GenerationTask(
        task_id=str(uuid4()), record_id=record_id, task_type=task_type, started=started,
        time=time, service=service, model=model, completion_tokens=completion_tokens, prompt_tokens=prompt_tokens,
        error_id=error_id, session_id=session.sessionId if session is not None else None,
    )

    try:
        database.add(generation_task)
        database.commit()
    except Exception as e:
        message = f"Failed to save generation log: {str(generation_task)}; Error: {str(e)}"
        log.warning(message, session)

def log_data_change(
    database: db.SQLAlchemySession, session: WebAPISession, changed: datetime,
    entity_type: db.DataEntityType, change_type: db.DataChangeType,
    *, entity_id: str | None = None, details: str | None = None,
):
    """Records a change to an app entity to the databse."""

    change_record = db.DataChangeRecord(
        changed=changed, username=session.username, session_id=session.sessionId,
        entity_type=entity_type, entity_id=entity_id, change_type=change_type,
        details=details,
    )

    try:
        database.add(change_record)
        database.commit()
    except Exception as exc:
        message = f"Failed to save app data change record: {str(change_record)}; Error: {str(exc)}"
        log.warning(message, session)

