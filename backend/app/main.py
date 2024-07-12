import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html, get_swagger_ui_oauth2_redirect_html
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import patient_conversations

# ----------------------------------
# LOGGING CONFIG

# Configure logging
logging.basicConfig(level=logging.INFO)

# Suppress readiness probes from the uvicorn logs
class HealthcheckEndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return record.getMessage().find("/healthcheck") == -1
    
logging.getLogger("uvicorn.access").addFilter(HealthcheckEndpointFilter())

# ----------------------------------
# WEB SETUP

# Create the app
app = FastAPI(title=f"{settings.APP_NAME} API", version=settings.APP_VERSION, docs_url=None, redoc_url=None)

# Configure static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------
# ENDPOINTS

# Root
@app.get("/")
async def root():
    return {"message": f"Welcome to the {settings.APP_NAME} API"}

# Favicon
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(Path("favicon.ico"))

# Readiness Probe
@app.get("/healthcheck", tags=["Health Check"])
async def root():
    return {"message": "Ready"}

# Configure self-hosted docs
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="/static/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui.css",
    )

@app.get(app.swagger_ui_oauth2_redirect_url, include_in_schema=False)
async def swagger_ui_redirect():
    return get_swagger_ui_oauth2_redirect_html()

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - ReDoc",
        redoc_js_url="/static/redoc.standalone.js"
    )

# Include API routers
app.include_router(patient_conversations.router, prefix="/api/audio", tags=["Audio"])

# ----------------------------------
# FALLBACK

# Handle case when the app is not run via the uvicorn command
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)