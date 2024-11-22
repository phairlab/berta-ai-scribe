import os
import json
import logging
import traceback
from datetime import datetime, timezone
from pathlib import Path
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request, Response, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html, get_swagger_ui_oauth2_redirect_html
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask
from snowflake.connector.secret_detector import SecretDetector
from sqlalchemy.orm import Session as SQLAlchemySession

import app.services.snowflake as snowflake
import app.services.db as db
from app.services.logging import log_error, log_request
from app.config import settings
from app.services.error_handling import WebAPIException
from app.services.measurement import ExecutionTimer
from app.services.logging import WebAPILogger, RequestMetrics
from app.services.security import decode_token, WebAPISession
from app.schemas import SimpleMessage, WebAPIError, WebAPIErrorDetail
from app.routers import (
    authorization, encounters, monitoring, note_definitions, 
    recordings, sample_recordings, tasks, user
)

# ----------------------------------
# LOGGING CONFIG

LOGGING_LEVEL = logging.getLevelNamesMapping()[settings.LOGGING_LEVEL.upper()]

# Configure basic logging.
if settings.ENVIRONMENT == "development":
    # Use a custom log format during development.
    log_format = "[%(asctime)s] %(levelname)s: [%(name)s] %(message)s"
    log_dateformat = "%H:%M:%S"
    logging.basicConfig(level=LOGGING_LEVEL, format=log_format, datefmt=log_dateformat)
else:
    # Use the standard log format for production.
    logging.basicConfig(level=LOGGING_LEVEL)

# Configure logging for external libraries.
uvicorn_level = LOGGING_LEVEL + 1 if LOGGING_LEVEL <= logging.DEBUG else max(LOGGING_LEVEL, logging.WARNING)
logging.getLogger("httpx").disabled = True
logging.getLogger("uvicorn.access").setLevel(uvicorn_level)

sqlalchemy_level = LOGGING_LEVEL + 1 if LOGGING_LEVEL <= logging.INFO else LOGGING_LEVEL
logging.getLogger("sqlalchemy.engine").setLevel(sqlalchemy_level)
logging.getLogger("sqlalchemy.pool").setLevel(sqlalchemy_level)

snowflake_level = LOGGING_LEVEL + 1 if LOGGING_LEVEL <= logging.INFO else LOGGING_LEVEL
logging.getLogger("snowflake.connector.cursor").disabled = True
for logger_name in ["snowflake.connector", "snowflake.connector.connection", "snowflake.snowpark.session", "botocore", "boto3"]:
    logger = logging.getLogger(logger_name)
    logger.setLevel(snowflake_level)
    for handler in logger.handlers:
        # Prevent secrets from leaking into logs
        handler.setFormatter(SecretDetector(None, log_dateformat))

# ----------------------------------
# WEB SETUP

# Define startup / shutdown behaviour
@asynccontextmanager
async def lifespan(_: FastAPI):
    # On startup, for development environments simulate the snowflake mounted stage.
    if settings.ENVIRONMENT == "development" and not os.path.isdir(settings.RECORDINGS_FOLDER):
        os.mkdir(settings.RECORDINGS_FOLDER)
        with SQLAlchemySession(snowflake.db_engine) as database, snowflake.start_session() as snowflake_session:
            for user in database.query(db.User).all():
                if not os.path.isdir(Path(settings.RECORDINGS_FOLDER, user.username)):
                    os.mkdir(Path(settings.RECORDINGS_FOLDER, user.username))
                try:
                    snowflake_session.file.get(f"@RECORDING_FILES/{user.username}",f"{settings.RECORDINGS_FOLDER}/{user.username}")
                except:
                    pass
    
    yield

    # On shutdown, gracefully clean up the database engine.
    try:
        snowflake.db_engine.dispose()
    except:
        pass

# Create the app
app = FastAPI(
    lifespan=lifespan, title=f"{settings.APP_NAME} API", version=settings.APP_VERSION,
    root_path="/api", root_path_in_servers=False,
    docs_url=None, redoc_url=None,
)

# ----------------------------------
# STATIC FILES

app.mount("/static", StaticFiles(directory="static"), name="static")

# ----------------------------------
# OPENAPI DOCS

# Active in development only.
if settings.ENVIRONMENT == "development":
    @app.get("/docs", include_in_schema=False)
    async def custom_swagger_ui_html():
        return get_swagger_ui_html(
            openapi_url=app.openapi_url,
            title=f"{app.title} - Swagger UI",
            swagger_favicon_url="static/favicon.ico",
            oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
            swagger_js_url="static/swagger-ui-bundle.js",
            swagger_css_url="static/swagger-ui.css",
        )

    @app.get(app.swagger_ui_oauth2_redirect_url, include_in_schema=False)
    async def swagger_ui_redirect():
        return get_swagger_ui_oauth2_redirect_html()

    @app.get("/redoc", include_in_schema=False)
    async def redoc_html():
        return get_redoc_html(
            openapi_url=app.openapi_url,
            title=f"{app.title} - ReDoc",
            redoc_favicon_url="static/favicon.ico",
            redoc_js_url="static/redoc.standalone.js"
        )

# ----------------------------------
# EXCEPTION HANDLERS

# Basic Errors
@app.exception_handler(WebAPIException)
async def webapi_exception_handler(request: Request, exc: WebAPIException):
    stack_trace = " ".join(traceback.TracebackException.from_exception(exc).format())

    try:
        request_id = request.headers.get("x-request-id")
    
        try:
            credentials = request.headers.get("authorization")
            if not credentials.startswith("Bearer "):
                raise Exception()
            
            session = decode_token(credentials.removeprefix("Bearer "))
        except:
            session = WebAPISession(username=request.headers.get("sf_context_current_user") or "Anonymous", sessionId="None")
    except:
        pass

    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(WebAPIError(
            detail=WebAPIErrorDetail(errorId=exc.uuid, name=exc.name, message=exc.message, fatal=exc.fatal),
        )),
        headers=exc.headers,
        background=BackgroundTask(
            log_error,
            datetime.now(timezone.utc), exc.name, exc.message, stack_trace, 
            error_id=exc.uuid, request_id=request_id, session=session,
        )
    )

# Validation Errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    stack_trace = " ".join(traceback.TracebackException.from_exception(exc).format())

    try:
        request_id = request.headers.get("x-request-id")
    
        try:
            credentials = request.headers.get("authorization")
            if not credentials.startswith("Bearer "):
                raise Exception()
            
            session = decode_token(credentials.removeprefix("Bearer "))
        except:
            session = WebAPISession(username=request.headers.get("sf_context_current_user") or "Anonymous", sessionId="None")
    except:
        pass

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder({ "detail": exc.errors(), "body": json.dumps(exc.body, default=str) }),
        background=BackgroundTask(
            log_error,
            datetime.now(timezone.utc), "Validation Error", str(exc), stack_trace,
            request_id=request_id, session=session
        )
    )

# Fallback / Unexpected Errors
@app.exception_handler(Exception)
async def fallback_exception_handler(request: Request, exc: Exception):
    stack_trace = " ".join(traceback.TracebackException.from_exception(exc).format())

    try:
        request_id = request.headers.get("x-request-id")
    
        try:
            credentials = request.headers.get("authorization")
            if not credentials.startswith("Bearer "):
                raise Exception()
            
            session = decode_token(credentials.removeprefix("Bearer "))
        except:
            session = WebAPISession(username=request.headers.get("sf_context_current_user") or "Anonymous", sessionId="None")
    except:
        pass

    error = WebAPIException(str(exc))

    return JSONResponse(
        status_code=error.status_code,
        content=jsonable_encoder(WebAPIError(
            detail=WebAPIErrorDetail(errorId=error.uuid, name=error.name, message=error.message, fatal=error.fatal),
        )),
        headers=error.headers,
        background=BackgroundTask(
            log_error,
            datetime.now(timezone.utc), "Internal Server Error", str(exc), stack_trace,
            error_id=error.uuid, request_id=request_id, session=session
        )
    )

# ----------------------------------
# MIDDLEWARE

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    log = WebAPILogger("app.http")

    requested_at = datetime.now(timezone.utc)

    headers = dict(request.scope["headers"])
    if b"jenkins-authorization" in headers:
        headers[b"authorization"] = headers[b"jenkins-authorization"]
        request.scope["headers"] = [(k, v) for k, v in headers.items()]

    if b"x-request-id" not in headers:
        headers[b"x-request-id"] = str(uuid4()).encode()
        request.scope["headers"] = [(k, v) for k, v in headers.items()]
        
    request_id = request.headers.get("x-request-id")
    
    try:
        credentials = request.headers.get("authorization")
        if not credentials.startswith("Bearer "):
            raise Exception()
        
        session = decode_token(credentials.removeprefix("Bearer "))
    except:
        session = WebAPISession(username=request.headers.get("sf_context_current_user") or "Anonymous", sessionId="None")

    with ExecutionTimer() as timer:
        response: Response = await call_next(request)

    if request.url.path == "/healthcheck" and response.status_code < 400:
        return response
    
    if request.url.path.startswith("/monitoring/") and response.status_code < 400:
        return response

    log.request(
        metrics = RequestMetrics(url=request.url.path, method=request.method, status_code=int(response.status_code), duration=timer.elapsed_ms),
        session = session
    )

    background_log_request = BackgroundTask(
        log_request,
        request_id, requested_at, request.url.path, request.method, int(response.status_code),
        timer.elapsed_ms, session=session,
    )
        
    if response.status_code >= 400:
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk
        
        log.error(response_body, session)
        
        return Response(
            content=response_body, status_code=response.status_code, headers=dict(response.headers),
            media_type=response.media_type, background=background_log_request
        )

    response.background = background_log_request
    return response

# ----------------------------------
# ENDPOINTS

# Root
@app.get("/", response_model=SimpleMessage, tags=["Miscellaneous"])
async def root():
    return {"message": f"Welcome to the {settings.APP_NAME} API"}

# Favicon
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(Path("static/favicon.ico"))

# Readiness Probe
@app.get("/healthcheck", response_model=SimpleMessage, tags=["Miscellaneous"])
async def health_check():
    return {"message": "Ready"}

# API routers
app.include_router(authorization.router, tags=["Authorization"])
app.include_router(user.router, prefix="/user", tags=["User"])
app.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
app.include_router(note_definitions.router, prefix="/note-definitions", tags=["Note Definitions"])
app.include_router(sample_recordings.router, prefix="/sample-recordings", tags=["Recordings"])
app.include_router(encounters.router, prefix="/encounters", tags=["Encounters"])
app.include_router(recordings.router, prefix="/recordings", tags=["Recordings"])
app.include_router(monitoring.router, prefix="/monitoring", tags=["Monitoring"])

# ----------------------------------
# FALLBACK

# Handle case when the app is not run via the uvicorn command
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)