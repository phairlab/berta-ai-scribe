import json
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import cast
from uuid import uuid4

from fastapi import FastAPI, Request, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.docs import (
    get_redoc_html,
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask

import app.config.db as db
from app.config import settings
from app.errors import Unauthorized, WebAPIException
from app.logging import (
    RequestMetrics,
    WebAPILogger,
    configure_logging,
    log_error,
    log_request,
)
from app.routers import (
    authorization,
    encounters,
    monitoring,
    note_definitions,
    recordings,
    sample_recordings,
    tasks,
    user,
)
from app.schemas import SimpleMessage, WebAPIError, WebAPIErrorDetail
from app.security import WebAPISession, decode_token
from app.utility.timing import ExecutionTimer

# ----------------------------------
# LOGGING CONFIG

configure_logging()

# ----------------------------------
# WEB SETUP


# Define startup / shutdown behaviour
@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.ENVIRONMENT == "development" and not db.is_datafolder_initialized():
        db.initialize_dev_datafolder()

    db.update_builtin_notetypes()

    # Run the app.
    yield

    # Shutdown: Dispose of the sql alchemy engine.
    db.engine.dispose()


# Create the app
app = FastAPI(
    lifespan=lifespan,
    title=f"{settings.APP_NAME} API",
    version=settings.APP_VERSION,
    root_path="/api",
    root_path_in_servers=False,
    docs_url=None,
    redoc_url=None,
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
            openapi_url=app.openapi_url,  # type: ignore
            title=f"{app.title} - Swagger UI",
            swagger_favicon_url="api/static/favicon.ico",
            oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
            swagger_js_url="api/static/swagger-ui-bundle.js",
            swagger_css_url="api/static/swagger-ui.css",
        )

    @app.get(app.swagger_ui_oauth2_redirect_url, include_in_schema=False)  # type: ignore
    async def swagger_ui_redirect():
        return get_swagger_ui_oauth2_redirect_html()

    @app.get("/redoc", include_in_schema=False)
    async def redoc_html():
        return get_redoc_html(
            openapi_url=app.openapi_url,  # type: ignore
            title=f"{app.title} - ReDoc",
            redoc_favicon_url="api/static/favicon.ico",
            redoc_js_url="api/static/redoc.standalone.js",
        )


# ----------------------------------
# EXCEPTION HANDLERS


# Basic Errors
@app.exception_handler(WebAPIException)
async def webapi_exception_handler(request: Request, exc: WebAPIException):
    stack_trace = " ".join(traceback.TracebackException.from_exception(exc).format())
    request_id: str | None = None
    session: WebAPISession | None = None

    try:
        request_id = request.headers.get("x-request-id")

        try:
            credentials = request.headers.get("authorization")
            if credentials is None or not credentials.startswith("Bearer "):
                raise Exception()

            session = decode_token(credentials.removeprefix("Bearer "))
        except Unauthorized:
            session = WebAPISession(
                username=request.headers.get("sf_context_current_user") or "Anonymous",
                sessionId="None",
            )
    except:  # noqa
        pass

    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(
            WebAPIError(
                detail=WebAPIErrorDetail(
                    errorId=exc.uuid,
                    name=exc.name,
                    message=exc.message,
                    fatal=exc.fatal,
                ),
            )
        ),
        headers=exc.headers,
        background=BackgroundTask(
            log_error,
            occurred=datetime.now(timezone.utc).astimezone(),
            name=exc.name,
            message=exc.message,
            stack_trace=stack_trace,
            error_id=exc.uuid,
            request_id=request_id,
            session=session,
        ),
    )


# Validation Errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    stack_trace = " ".join(traceback.TracebackException.from_exception(exc).format())
    request_id: str | None = None
    session: WebAPISession | None = None

    try:
        request_id = request.headers.get("x-request-id")

        try:
            credentials = request.headers.get("authorization")
            if credentials is None or not credentials.startswith("Bearer "):
                raise Exception()

            session = decode_token(credentials.removeprefix("Bearer "))
        except Unauthorized:
            session = WebAPISession(
                username=request.headers.get("sf_context_current_user") or "Anonymous",
                sessionId="None",
            )
    except:  # noqa
        pass

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder(
            {"detail": exc.errors(), "body": json.dumps(exc.body, default=str)}
        ),
        background=BackgroundTask(
            log_error,
            occurred=datetime.now(timezone.utc).astimezone(),
            name="Validation Error",
            message=str(exc),
            stack_trace=stack_trace,
            request_id=request_id,
            session=session,
        ),
    )


# Fallback / Unexpected Errors
@app.exception_handler(Exception)
async def fallback_exception_handler(request: Request, exc: Exception):
    stack_trace = " ".join(traceback.TracebackException.from_exception(exc).format())
    request_id: str | None = None
    session: WebAPISession | None = None

    try:
        request_id = request.headers.get("x-request-id")

        try:
            credentials = request.headers.get("authorization")
            if credentials is None or not credentials.startswith("Bearer "):
                raise Exception()

            session = decode_token(credentials.removeprefix("Bearer "))
        except Unauthorized:
            session = WebAPISession(
                username=request.headers.get("sf_context_current_user") or "Anonymous",
                sessionId="None",
            )
    except:  # noqa
        pass

    error = WebAPIException(str(exc))

    return JSONResponse(
        status_code=error.status_code,
        content=jsonable_encoder(
            WebAPIError(
                detail=WebAPIErrorDetail(
                    errorId=error.uuid,
                    name=error.name,
                    message=error.message,
                    fatal=error.fatal,
                ),
            )
        ),
        headers=error.headers,
        background=BackgroundTask(
            log_error,
            occurred=datetime.now(timezone.utc).astimezone(),
            name="Internal Server Error",
            message=str(exc),
            stack_trace=stack_trace,
            error_id=error.uuid,
            request_id=request_id,
            session=session,
        ),
    )


# ----------------------------------
# MIDDLEWARE


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    log = WebAPILogger("app.http")

    requested_at = datetime.now(timezone.utc).astimezone()

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
        if credentials is None or not credentials.startswith("Bearer "):
            raise Unauthorized("Credentials not provided")

        session = decode_token(credentials.removeprefix("Bearer "))
    except Unauthorized:
        session = WebAPISession(
            username=request.headers.get("sf_context_current_user") or "Anonymous",
            sessionId="None",
        )

    with ExecutionTimer() as timer:
        response: Response = cast(Response, await call_next(request))

    if request.url.path == "/healthcheck" and response.status_code < 400:
        return response

    if request.url.path.startswith("/monitoring/") and response.status_code < 400:
        return response

    log.request(
        metrics=RequestMetrics(
            url=request.url.path,
            method=request.method,
            status_code=int(response.status_code),
            duration=cast(int, timer.elapsed_ms),
        ),
        session=session,
    )

    background_log_request = BackgroundTask(
        log_request,
        request_id=request_id,
        requested=requested_at,
        url=request.url.path,
        method=request.method,
        status_code=int(response.status_code),
        duration=cast(int, timer.elapsed_ms),
        session=session,
    )

    if response.status_code >= 400:
        response_body: bytes = b""
        async for chunk in response.body_iterator:  # type: ignore
            response_body += cast(bytes, chunk)

        log.error(str(response_body), session)

        return Response(
            content=response_body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
            background=background_log_request,
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
app.include_router(
    note_definitions.router, prefix="/note-definitions", tags=["Note Definitions"]
)
app.include_router(
    sample_recordings.router, prefix="/sample-recordings", tags=["Recordings"]
)
app.include_router(encounters.router, prefix="/encounters", tags=["Encounters"])
app.include_router(recordings.router, prefix="/recordings", tags=["Recordings"])
app.include_router(monitoring.router, prefix="/monitoring", tags=["Monitoring"])

# ----------------------------------
# FALLBACK

# Handle case when the app is not run via the uvicorn command
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
