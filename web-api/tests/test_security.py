from datetime import timedelta

import pytest

from app.config import settings
from app.errors import Unauthorized
from app.schemas import WebAPISession
from app.security import create_access_token, create_token, decode_token


class TestCreateAndDecodeToken:
    def test_roundtrip(self):
        session = WebAPISession(
            username="alice",
            sessionId="sess-1",
            rights=["read"],
        )
        token = create_access_token(session)
        decoded = decode_token(token)

        assert decoded.username == "alice"
        assert decoded.sessionId == "sess-1"
        assert decoded.rights == ["read"]


class TestExpiredToken:
    def test_raises_unauthorized(self):
        token = create_token(
            {"username": "alice", "sessionId": "s1"},
            expires_delta=timedelta(seconds=-10),
            secret=settings.ACCESS_TOKEN_SECRET,
        )
        with pytest.raises(Unauthorized):
            decode_token(token)


class TestInvalidToken:
    def test_raises_unauthorized(self):
        with pytest.raises(Unauthorized):
            decode_token("not.a.valid.token")


class TestGoogleSubFormat:
    def test_google_sub_returns_prefixed_username(self):
        token = create_token(
            {"sub": "12345"},
            expires_delta=timedelta(minutes=10),
            secret=settings.ACCESS_TOKEN_SECRET,
        )
        decoded = decode_token(token)
        assert decoded.username == "google_12345"


class TestMissingFields:
    def test_empty_payload_raises_unauthorized(self):
        token = create_token(
            {},
            expires_delta=timedelta(minutes=10),
            secret=settings.ACCESS_TOKEN_SECRET,
        )
        with pytest.raises(Unauthorized):
            decode_token(token)
