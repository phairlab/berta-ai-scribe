import json
import os
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import cast
from uuid import uuid4
import app.routers.google_auth as google_auth


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
from fastapi.middleware.cors import CORSMiddleware
from starlette.background import BackgroundTask

import app.config.db as db
from app.config import settings, is_cognito_supported
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

if is_cognito_supported:
    from app.routers import cognito_auth

from app.schemas import SimpleMessage, WebAPIError, WebAPIErrorDetail
from app.security import WebAPISession, decode_token
from app.utility.timing import ExecutionTimer
from app.config.storage import USE_S3_STORAGE
from app.services.s3_storage import s3_storage
from app.middleware.rate_limiter import rate_limit_middleware
from app.middleware.security_headers import security_headers_middleware
from app.middleware.csrf_protection import csrf_middleware

configure_logging()

@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.ENVIRONMENT == "development" and not db.is_datafolder_initialized():
        db.initialize_dev_datafolder()
        db.update_builtin_notetypes()
    else:
        # Always update built-in note types in production too
        db.update_builtin_notetypes()

    # Run the app.
    yield

    # Shutdown: Dispose of the sql alchemy engine.
    db.engine.dispose()


app = FastAPI(
    lifespan=lifespan,
    title=f"{settings.APP_NAME} API",
    version=settings.APP_VERSION,
    root_path="/api",
    root_path_in_servers=False,
    docs_url=None,
    redoc_url=None,
)

# Middleware order: last added = first executed
if settings.ENVIRONMENT == "production":
    @app.middleware("http")
    async def add_csrf_protection(request: Request, call_next):
        return await csrf_middleware(request, call_next)
    print("CSRF protection middleware configured for production")

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    return await security_headers_middleware(request, call_next)
print("Security headers middleware configured")

if settings.ENVIRONMENT == "production":
    @app.middleware("http")
    async def add_rate_limiting(request: Request, call_next):
        return await rate_limit_middleware(request, call_next)
    print("Rate limiting middleware configured for production")

# CORS middleware must be last to run first and add headers to all responses
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:4000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:4000",
        "http://127.0.0.1:4000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
print("CORS middleware configured")

app.mount("/static", StaticFiles(directory="static"), name="static")

# OpenAPI docs active in development only
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

if settings.USE_GOOGLE_AUTH:
    app.include_router(
        google_auth.router,
        prefix="/auth",
        tags=["Authentication"],
    )

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


@app.get("/", response_model=SimpleMessage, tags=["Miscellaneous"])
async def root():
    return {"message": f"Welcome to the {settings.APP_NAME} API"}


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(Path("static/favicon.ico"))


@app.get("/healthcheck", response_model=SimpleMessage, tags=["Miscellaneous"])
async def health_check():
    return {"message": "Ready"}


app.include_router(encounters.router, prefix="/encounters", tags=["Encounters"])
app.include_router(
    note_definitions.router, prefix="/note-definitions", tags=["Note Definitions"]
)
app.include_router(
    recordings.router, prefix="/recordings", tags=["Recordings"]
)
app.include_router(
    sample_recordings.router, prefix="/sample-recordings", tags=["Sample Recordings"]
)
app.include_router(
    user.router, prefix="/user", tags=["User"]
)
app.include_router(
    tasks.router, prefix="/tasks", tags=["Tasks"]
)
app.include_router(
    monitoring.router, prefix="/monitoring", tags=["Monitoring"]
)

if settings.ENVIRONMENT == "development":
    print("Including development auth router...")
    app.include_router(
        authorization.router,
        prefix="/auth",
        tags=["Authentication"],
        include_in_schema=True
    )
    print("Development auth router included")
elif is_cognito_supported:
    app.include_router(
        cognito_auth.router,
        prefix="/auth",
        tags=["Authentication"],
        include_in_schema=True
    )
else:
    app.include_router(
        authorization.router,
        prefix="/auth",
        tags=["Authentication"],
        include_in_schema=True
    )

# Handle case when the app is not run via the uvicorn command
if __name__ == "__main__":
    import uvicorn

    if USE_S3_STORAGE:
        import os
        
        print("AWS credentials detected. Checking if prompts need to be synced to S3...")
        
        
        def ensure_prompts_in_s3():
            try:
                # Check if prompts directory exists locally
                prompts_dir = Path(settings.PROMPTS_FOLDER)
                if not prompts_dir.exists():
                    print(f"Warning: Local prompts directory '{prompts_dir}' not found.")
                    return
                    
                # Basic check: try to list one known prompt file in S3
                test_file = f"prompts/label-transcript.txt"
                try:
                    s3_storage.s3_client.head_object(
                        Bucket=s3_storage.bucket_name, 
                        Key=test_file
                    )
                    print("Prompts already exist in S3.")
                except Exception:
                    print("Prompts not found in S3. Syncing local prompts to S3...")
                    
                    # Collect all files to upload
                    all_files = list(prompts_dir.glob('**/*'))
                    total_files = sum(1 for f in all_files if f.is_file())
                    print(f"Found {total_files} files to upload")
                    
                    # Print subdirectories being uploaded
                    directories = set()
                    for local_path in all_files:
                        if local_path.is_file():
                            parent_dir = local_path.parent.relative_to(prompts_dir)
                            if parent_dir != Path('.'):  # Not in the root directory
                                directories.add(str(parent_dir))
                    
                    if directories:
                        print(f"Subdirectories: {', '.join(sorted(directories))}")
                    
                    # Upload all prompts to S3
                    files_uploaded = 0
                    for local_path in all_files:
                        if local_path.is_file():
                            relative_path = local_path.relative_to(prompts_dir)
                            s3_key = f"prompts/{relative_path}"
                            
                            try:
                                print(f"Uploading {local_path} -> s3://{s3_storage.bucket_name}/{s3_key}")
                                s3_storage.s3_client.upload_file(
                                    str(local_path), 
                                    s3_storage.bucket_name, 
                                    s3_key
                                )
                                files_uploaded += 1
                            except Exception as e:
                                print(f"Error uploading {local_path}: {e}")
                    
                    print(f"Sync complete. {files_uploaded} files uploaded to S3.")
                    
                    # Verify one file from each main subdirectory to ensure everything is accessible
                    for directory in ['builtin-note-types', 'note-formats']:
                        try:
                            # List one directory to confirm it's accessible
                            response = s3_storage.s3_client.list_objects_v2(
                                Bucket=s3_storage.bucket_name,
                                Prefix=f"prompts/{directory}/"
                            )
                            if 'Contents' in response and len(response['Contents']) > 0:
                                print(f"✓ Verified: {directory}/ contains {len(response['Contents'])} items")
                            else:
                                print(f"⚠️ Warning: {directory}/ appears to be empty")
                        except Exception as e:
                            print(f"⚠️ Warning: Could not verify {directory}/: {e}")
            except Exception as e:
                print(f"Warning: Failed to sync prompts to S3: {e}")
                print("Application will continue with local prompt fallback.")
        
        # Call the function to ensure prompts are in S3
        ensure_prompts_in_s3()

    uvicorn.run(app, host="0.0.0.0", port=8000)
