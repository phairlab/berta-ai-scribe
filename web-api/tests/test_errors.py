from app.errors import (
    AudioProcessingError,
    BadRequest,
    DatabaseError,
    ExternalServiceError,
    ExternalServiceInterruption,
    ExternalServiceTimeout,
    Forbidden,
    NotFound,
    Unauthorized,
    UnsupportedAudioFormat,
    WebAPIException,
)


class TestWebAPIException:
    def test_status_code(self):
        err = WebAPIException("something went wrong")
        assert err.status_code == 500

    def test_fatal_is_false(self):
        err = WebAPIException("something went wrong")
        assert err.fatal is False

    def test_message(self):
        err = WebAPIException("something went wrong")
        assert err.message == "something went wrong"
        assert str(err) == "something went wrong"

    def test_has_unique_uuid(self):
        err1 = WebAPIException("a")
        err2 = WebAPIException("b")
        assert err1.uuid != err2.uuid


class TestBadRequest:
    def test_status_code(self):
        err = BadRequest("bad input")
        assert err.status_code == 400

    def test_fatal(self):
        err = BadRequest("bad input")
        assert err.fatal is True


class TestUnauthorized:
    def test_status_code(self):
        err = Unauthorized("no credentials")
        assert err.status_code == 401

    def test_fatal(self):
        err = Unauthorized("no credentials")
        assert err.fatal is True

    def test_headers(self):
        err = Unauthorized("no credentials")
        assert err.headers == {"WWW-Authenticate": "Bearer"}


class TestForbidden:
    def test_status_code(self):
        err = Forbidden("not allowed")
        assert err.status_code == 403

    def test_fatal(self):
        err = Forbidden("not allowed")
        assert err.fatal is True


class TestNotFound:
    def test_status_code(self):
        err = NotFound("missing")
        assert err.status_code == 404

    def test_fatal(self):
        err = NotFound("missing")
        assert err.fatal is True


class TestUnsupportedAudioFormat:
    def test_status_code(self):
        err = UnsupportedAudioFormat("bad format")
        assert err.status_code == 415

    def test_fatal(self):
        err = UnsupportedAudioFormat("bad format")
        assert err.fatal is True


class TestAudioProcessingError:
    def test_status_code(self):
        err = AudioProcessingError("processing failed")
        assert err.status_code == 500

    def test_fatal(self):
        err = AudioProcessingError("processing failed")
        assert err.fatal is True


class TestDatabaseError:
    def test_status_code(self):
        err = DatabaseError("db failure")
        assert err.status_code == 500

    def test_fatal_is_false(self):
        err = DatabaseError("db failure")
        assert err.fatal is False


class TestExternalServiceError:
    def test_status_code(self):
        err = ExternalServiceError("Ollama", "connection refused")
        assert err.status_code == 502

    def test_fatal(self):
        err = ExternalServiceError("Ollama", "connection refused")
        assert err.fatal is True

    def test_name_includes_source(self):
        err = ExternalServiceError("Ollama", "connection refused")
        assert err.name == "External Service Error: Ollama"

    def test_source(self):
        err = ExternalServiceError("Ollama", "connection refused")
        assert err.source == "Ollama"


class TestExternalServiceInterruption:
    def test_status_code(self):
        err = ExternalServiceInterruption("S3", "timeout")
        assert err.status_code == 503

    def test_fatal_is_false(self):
        err = ExternalServiceInterruption("S3", "timeout")
        assert err.fatal is False


class TestExternalServiceTimeout:
    def test_status_code(self):
        err = ExternalServiceTimeout("Bedrock", "timed out")
        assert err.status_code == 504

    def test_fatal_is_false(self):
        err = ExternalServiceTimeout("Bedrock", "timed out")
        assert err.fatal is False


class TestUniqueUUIDs:
    def test_all_errors_get_unique_uuids(self):
        errors = [
            WebAPIException("a"),
            BadRequest("b"),
            Unauthorized("c"),
            Forbidden("d"),
            NotFound("e"),
            UnsupportedAudioFormat("f"),
            AudioProcessingError("g"),
            DatabaseError("h"),
            ExternalServiceError("src", "i"),
            ExternalServiceInterruption("src", "j"),
            ExternalServiceTimeout("src", "k"),
        ]
        uuids = [e.uuid for e in errors]
        assert len(uuids) == len(set(uuids))
