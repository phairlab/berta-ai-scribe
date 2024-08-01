from fastapi import HTTPException

class APIError(Exception):
    description: str = "A server error occurred."
    message: str
    should_retry: bool = False
    status_code: int = 500

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

    def __str__(self) -> str:
        return f"{self.description} Details: {self.message}"

    def to_http(self) -> HTTPException:
        return HTTPException(self.status_code, detail={
            "message": self.description,
            "shouldRetry" : self.should_retry,
            "details": self.message,
        })

class BadRequest(APIError):
    description = "Bad Request."
    should_retry = False
    status_code = 400

class UnsupportedMediaFormat(APIError):
    description = "Unsupported file type."
    should_retry = False
    status_code = 415

class AudioProcessingError(APIError):
    description = "An error occurred while processing the audio file."
    should_retry = False
    status_code = 500

class AIServiceError(APIError):
    description = "The AI Service reported an error."
    should_retry = False
    status_code = 502

class TransientAIServiceError(APIError):
    description = "The AI Service is temporarily unavailable."
    should_retry = True
    status_code = 503

class AIServiceTimeout(APIError):
    description = "The AI Service timed out."
    should_retry = True
    status_code = 504