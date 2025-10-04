import logging
from datetime import datetime, timezone
from http.client import responses as http_responses
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, Header
from pydantic import BaseModel

import app.config.db as db
from app.config import settings
from app.errors import AudioProcessingError, WebAPIException
from app.schemas import GenerationOutput, WebAPISession
from app.utility.timing import ExecutionTimer

LOGGING_LEVEL = logging.getLevelNamesMapping()[settings.LOGGING_LEVEL.upper()]


def configure_logging():
    # Configure basic logging.
    if settings.ENVIRONMENT == "development":
        # Use a custom log format during development.
        log_format = "[%(asctime)s] %(levelname)s: [%(name)s] %(message)s"
        log_dateformat = "%H:%M:%S"
        logging.basicConfig(
            level=LOGGING_LEVEL, format=log_format, datefmt=log_dateformat
        )
    else:
        # Use the standard log format for production.
        logging.basicConfig(level=LOGGING_LEVEL)

    # Configure logging for external libraries.
    uvicorn_level = (
        LOGGING_LEVEL + 1
        if LOGGING_LEVEL <= logging.DEBUG
        else max(LOGGING_LEVEL, logging.WARNING)
    )
    logging.getLogger("httpx").disabled = True
    logging.getLogger("uvicorn.access").setLevel(uvicorn_level)

    sqlalchemy_level = (
        LOGGING_LEVEL + 1 if LOGGING_LEVEL <= logging.INFO else LOGGING_LEVEL
    )
    logging.getLogger("sqlalchemy.engine").setLevel(sqlalchemy_level)
    logging.getLogger("sqlalchemy.pool").setLevel(sqlalchemy_level)

    snowflake_level = (
        LOGGING_LEVEL + 1 if LOGGING_LEVEL <= logging.INFO else LOGGING_LEVEL
    )
    
    for logger_name in [
        "botocore",
        "boto3",
    ]:
        logger = logging.getLogger(logger_name)
        logger.setLevel(snowflake_level)


class RequestMetrics(BaseModel):
    url: str
    method: str
    status_code: int
    duration: int


class WebAPILogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.level = logging.getLevelNamesMapping()[
            settings.LOGGING_LEVEL.upper()
        ]

    @staticmethod
    def __session_message(message: str, session: WebAPISession | None):
        return (
            message
            if session is None
            else f"{message}"
            " [User: {session.username}, Session ID: {session.sessionId}]"
        )

    def request(self, metrics: RequestMetrics, session: WebAPISession | None = None):
        status_text = http_responses.get(metrics.status_code) or "Unknown"
        message = (
            f"{metrics.method} {metrics.url}"
            f" [{metrics.status_code} {status_text}] in {metrics.duration} ms"
        )
        self.logger.info(WebAPILogger.__session_message(message, session))

    def authenticated(self, session: WebAPISession):
        self.logger.info(
            WebAPILogger.__session_message("User session started", session)
        )

    def info(self, message: str, session: WebAPISession | None = None):
        self.logger.info(WebAPILogger.__session_message(message, session))

    def debug(self, message: str, session: WebAPISession | None = None):
        self.logger.debug(WebAPILogger.__session_message(message, session))

    def warning(self, message: str, session: WebAPISession | None = None):
        self.logger.warning(WebAPILogger.__session_message(message, session))

    def error(self, message: str, session: WebAPISession | None = None):
        self.logger.error(WebAPILogger.__session_message(message, session))

    def exception(self, exception: Exception, session: WebAPISession | None = None):
        self.logger.exception(
            exception,
            (
                {"User": session.username, "Session ID": session.sessionId}
                if session is not None
                else None
            ),
        )


async def get_user_agent(
    user_agent: Annotated[str | None, Header()] = None,
    berta_user_agent: Annotated[str | None, Header()] = None,
) -> str:
    return berta_user_agent or user_agent or ""


useUserAgent = Annotated[str, Depends(get_user_agent)]


async def get_request_id(x_request_id: Annotated[str | None, Header()] = None) -> str:
    return x_request_id or ""


useRequestId = Annotated[str, Depends(get_request_id)]

log = WebAPILogger(__name__)


def log_session(
    *, database: db.DatabaseSession, session: WebAPISession, user_agent: str
):
    """Records the initiation of a user session to the database."""

    try:
        session_record = db.SessionRecord(
            session_id=session.sessionId,
            username=session.username,
            started=datetime.now(timezone.utc).astimezone(),
            user_agent=user_agent,
        )

        database.add(session_record)
        database.commit()
    except Exception as e:
        message = f"Failed to save session log: {str(e)}"
        log.warning(message, session)


def log_error(
    *,
    occurred: datetime,
    name: str,
    message: str,
    stack_trace: str,
    error_id: str | None = None,
    request_id: str | None = None,
    session: WebAPISession | None = None,
):
    """Saves the record of an exception."""

    error_record = db.ErrorRecord(
        error_id=error_id if error_id is not None else str(uuid4()),
        occurred=occurred,
        name=name,
        message=message,
        stack_trace=stack_trace,
        request_id=request_id,
        session_id=session.sessionId if session is not None else None,
    )

    try:
        with db.DatabaseSessionMaker() as database:
            database.add(error_record)
            database.commit()
    except Exception as e:
        message = f"Failed to save error log: {str(error_record)}; Error: {str(e)}"
        log.warning(message, session)


def log_request(
    *,
    request_id: str | None,
    requested: datetime,
    url: str,
    method: str,
    status_code: int,
    duration: int,
    session: WebAPISession | None = None,
):
    """Saves the record of a request."""

    request_record = db.RequestRecord(
        request_id=request_id if request_id is not None else str(uuid4()),
        requested=requested,
        url=url,
        method=method,
        status_code=status_code,
        status_text=http_responses.get(status_code) or "Unknown",
        duration=duration,
        session_id=session.sessionId if session is not None else None,
    )

    try:
        with db.DatabaseSessionMaker() as database:
            database.add(request_record)
            database.commit()
    except Exception as e:
        message = f"Failed to save request log: {str(request_record)}; Error: {str(e)}"
        log.warning(message, session)


def log_audio_conversion(
    *,
    database: db.DatabaseSession,
    recording_id: str,
    timer: ExecutionTimer,
    original_file: tuple[str, int],
    converted_file: tuple[str, int] | None = None,
    task_type: str = "NEW RECORDING",
    error: AudioProcessingError | None = None,
    session: WebAPISession | None = None,
):
    """Saves a record of an audio conversion task."""

    audio_conversion_task = db.AudioConversionTask(
        task_id=str(uuid4()),
        task_type=task_type,
        started=timer.started_at,
        time=timer.elapsed_ms,
        recording_id=recording_id,
        original_media_type=original_file[0],
        original_file_size=original_file[1],
        converted_media_type=None if converted_file is None else converted_file[0],
        converted_file_size=None if converted_file is None else converted_file[1],
        error_id=None if error is None else error.uuid,
        session_id=session.sessionId if session is not None else None,
    )

    try:
        database.add(audio_conversion_task)
        database.commit()
    except Exception as e:
        message = (
            f"Failed to save audio conversion log: {str(audio_conversion_task)}"
            f"; Error: {str(e)}"
        )
        log.warning(message, session)


def log_transcription(
    *,
    database: db.DatabaseSession,
    recording_id: str,
    timer: ExecutionTimer,
    service: str,
    error: Exception | None = None,
    session: WebAPISession | None = None,
):
    """Saves a record of a transcription task."""

    transcription_task = db.TranscriptionTask(
        task_id=str(uuid4()),
        recording_id=recording_id,
        started=timer.started_at,
        time=timer.elapsed_ms,
        service=service,
        error_id=error.uuid if isinstance(error, WebAPIException) else None,
        session_id=session.sessionId if session is not None else None,
    )

    try:
        database.add(transcription_task)
        database.commit()
    except Exception as e:
        message = (
            f"Failed to save transcription log: {str(transcription_task)}"
            f"; Error: {str(e)}"
        )
        log.warning(message, session)


def log_generation(
    *,
    database: db.DatabaseSession,
    record_id: str,
    task_type: str,
    generation_output: GenerationOutput,
    error: Exception | None = None,
    session: WebAPISession | None = None,
):
    """Saves a record of a generative AI task."""

    generation_task = db.GenerationTask(
        task_id=str(uuid4()),
        record_id=record_id,
        task_type=task_type,
        started=generation_output.generatedAt,
        time=generation_output.timeToGenerate,
        service=generation_output.service,
        model=generation_output.model,
        completion_tokens=generation_output.completionTokens,
        prompt_tokens=generation_output.promptTokens,
        error_id=error.uuid if isinstance(error, WebAPIException) else None,
        session_id=session.sessionId if session is not None else None,
    )

    try:
        database.add(generation_task)
        database.commit()
    except Exception as e:
        message = (
            f"Failed to save generation log: {str(generation_task)}; Error: {str(e)}"
        )
        log.warning(message, session)


def log_data_change(
    *,
    database: db.DatabaseSession,
    session: WebAPISession,
    changed: datetime,
    entity_type: db.DataEntityType,
    change_type: db.DataChangeType,
    entity_id: str | None = None,
    server_task: bool = False,
):
    """Records a change to an app entity to the databse."""

    change_record = db.DataChangeRecord(
        changed=changed,
        username=session.username,
        session_id=session.sessionId,
        entity_type=entity_type,
        entity_id=entity_id,
        change_type=change_type,
        server_task=server_task,
    )

    try:
        database.add(change_record)
        database.commit()
    except Exception as exc:
        message = (
            f"Failed to save app data change record: {str(change_record)}"
            f"; Error: {str(exc)}"
        )
        log.warning(message, session)
