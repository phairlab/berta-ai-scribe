import os
import sys
from unittest.mock import MagicMock, patch

# --- Set environment variables BEFORE any app imports ---
os.environ["ENVIRONMENT"] = "development"
os.environ["ACCESS_TOKEN_SECRET"] = "test-secret-key-for-testing"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["USE_AURORA"] = "false"
os.environ["USE_COGNITO"] = "false"
os.environ["USE_GOOGLE_AUTH"] = "false"
os.environ["TRANSCRIPTION_SERVICE"] = "Parakeet MLX"
os.environ["GENERATIVE_AI_SERVICE"] = "Ollama"

# --- Ensure the static directory exists (app mounts it at startup) ---
os.makedirs("static", exist_ok=True)

# --- Mock heavy external service modules before they are imported ---
# These mocks prevent ImportError when optional packages are not installed.

# AWS SDK
sys.modules.setdefault("boto3", MagicMock())
sys.modules.setdefault("botocore", MagicMock())
sys.modules.setdefault("botocore.exceptions", MagicMock())

# Audio processing
sys.modules.setdefault("pydub", MagicMock())
sys.modules.setdefault("pydub.silence", MagicMock())

# ML / transcription dependencies
sys.modules.setdefault("librosa", MagicMock())
sys.modules.setdefault("numpy", MagicMock())
sys.modules.setdefault("transformers", MagicMock())
sys.modules.setdefault("speechbrain", MagicMock())
sys.modules.setdefault("whisperx", MagicMock())
sys.modules.setdefault("faster_whisper", MagicMock())

# File type detection
sys.modules.setdefault("magic", MagicMock())

# HTTP / AI client libraries
sys.modules.setdefault("aiohttp", MagicMock())
sys.modules.setdefault("openai", MagicMock())
sys.modules.setdefault("requests", MagicMock())

# parakeet_mlx is only available on Apple Silicon and may not be installed
sys.modules.setdefault("parakeet_mlx", MagicMock())

# Mock the AI config module to avoid connecting to Ollama / loading models
# We need to mock it before app.utility.conversion imports it
_mock_ai_module = MagicMock()
_mock_ai_module.generative_ai_services = []
_mock_ai_module.PLAINTEXT_NOTE_SYSTEM_PROMPT = ""
_mock_ai_module.MARKDOWN_NOTE_SYSTEM_PROMPT = ""
_mock_ai_module.LABEL_TRANSCRIPT_SYSTEM_PROMPT = ""
_mock_ai_module.note_format_prompts = {}
sys.modules["app.config.ai"] = _mock_ai_module

import json
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.config.db import Base, get_database_session
from app.schemas import WebAPISession
from app.security import authenticate_session, create_access_token


# --- In-memory SQLite test database ---
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


# Enable foreign key support for SQLite (off by default)
@event.listens_for(test_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestSessionMaker = sessionmaker(bind=test_engine)

# --- Fixed test session for authentication ---
TEST_SESSION = WebAPISession(
    username="testuser",
    sessionId="test-session-id",
    rights=["read", "write"],
)


def _reset_tables():
    """Drop and recreate all tables to ensure a clean state."""
    with test_engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS sqid_sequence"))
        conn.commit()
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    with test_engine.connect() as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS sqid_sequence (id INTEGER PRIMARY KEY)"
        ))
        conn.execute(text("INSERT INTO sqid_sequence (id) VALUES (42874)"))
        conn.commit()


# Initial table creation
_reset_tables()


@pytest.fixture(autouse=True)
def _clean_database():
    """Reset tables before each test to ensure isolation."""
    _reset_tables()
    yield


@pytest.fixture()
def db_session():
    """Provide a database session for each test."""
    session = TestSessionMaker()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def auth_headers():
    """Provide Authorization headers with a valid JWT token."""
    token = create_access_token(TEST_SESSION)
    return {"Authorization": f"Bearer {token}"}


def _override_get_database_session():
    session = TestSessionMaker()
    try:
        yield session
    finally:
        session.close()


async def _override_authenticate_session():
    return TEST_SESSION


# Import the FastAPI app and apply dependency overrides
from app.main import app  # noqa: E402

app.dependency_overrides[get_database_session] = _override_get_database_session
app.dependency_overrides[authenticate_session] = _override_authenticate_session


@pytest_asyncio.fixture()
async def client():
    """Provide an async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
