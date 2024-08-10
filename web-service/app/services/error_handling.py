from fastapi import HTTPException

class APIError(Exception):
    name: str = "API: Unexpected Error"
    message: str
    should_retry: bool = False
    status_code: int = 500

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

    def __str__(self) -> str:
        return f"[{self.name}] {self.message}"

    def to_http_exception(self) -> HTTPException:
        return HTTPException(self.status_code, detail={
            "name": self.name,
            "message": self.message,
            "shouldRetry" : self.should_retry,
        })

class BadRequest(APIError):
    name = "API: Bad Request"
    should_retry = False
    status_code = 400

class UnsupportedMediaFormat(APIError):
    name = "API: Unsupported File Type"
    should_retry = False
    status_code = 415

class AudioProcessingError(APIError):
    name = "API: Audio Processing Error"
    should_retry = False
    status_code = 500

class AIServiceError(APIError):
    name = "API: AI Service Error"
    should_retry = False
    status_code = 502

class TransientAIServiceError(APIError):
    name = "API: AI Service Unavailable"
    should_retry = True
    status_code = 503

class AIServiceTimeout(APIError):
    name = "API: AI Service Timeout"
    should_retry = True
    status_code = 504