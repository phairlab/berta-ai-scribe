from fastapi import HTTPException

class WebServiceError(Exception):
    """
    Represents an unknown error that occurred within the web service.

    - **HTTP Status Code:** 500 Internal Server Error
    - **Client Should Auto-Retry:** False. The issue must be investigated and corrected by the development team.
    """
    name: str = "Unexpected Error"
    source: str = "Server"
    message: str
    resolution: str = "The issue must be investigated and corrected by the development team."
    should_retry: bool = False
    status_code: int = 500

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

    def __str__(self) -> str:
        return f"[{self.source}: {self.name}] {self.message}"

    def as_http_exception(self) -> HTTPException:
        return HTTPException(self.status_code, detail={
            "name": f"{self.source}: {self.name}",
            "message": self.message,
            "resolution": self.resolution,
            "shouldRetry" : self.should_retry,
        })

class BadRequest(WebServiceError):
    """
    Represents an error that occurred due to a client error.

    - **HTTP Status Code:** 400 Bad Request
    - **Client Should Auto-Retry:** False. The issue must be investigated and corrected by the development team.
    """
    name = "Bad Request"
    resolution = "The issue must be investigated and corrected by the development team."
    should_retry = False
    status_code = 400

class Unauthorized(WebServiceError):
    """
    An attempt to access data outside an authenticated connection.

    - **HTTP Status Code:** 401 Unauthorized
    - **Client Should Auto-Retry:** False. The issue must be investigated and corrected by the development team.
    """
    name = "Unauthorized"
    resolution = "The issue must be investigated and corrected by the development team."
    should_retry = False
    status_code = 401

class Forbidden(WebServiceError):
    """
    The current user does not have permission to perform this action.

    - **HTTP Status Code:** 401 Unauthorized
    - **Client Should Auto-Retry:** False. The issue must be investigated and corrected by the development team.
    """
    name = "Unauthorized"
    resolution = "The issue must be investigated and corrected by the development team."
    should_retry = False
    status_code = 403

class UnsupportedAudioFormat(WebServiceError):
    """
    Represents an error that occurred due to an audio file being provided in an unsupported format.

    - **HTTP Status Code:** 415 Unsupported Media Type
    - **Client Should Auto-Retry:** False. If this error arose due to a user-selected audio file, user should be directed to select a different file; otherwise this issue must be corrected by the development team.
    """
    name = "Unsupported File Type"
    resolution = "If this error arose due to a user-selected audio file, please select a different file; otherwise this issue must be corrected by the development team."
    should_retry = False
    status_code = 415

class AudioProcessingError(WebServiceError):
    """
    Represents an error that occurred during audio processing.

    - **HTTP Status Code:** 500 Internal Server Error
    - **Client Should Auto-Retry:** False. The issue must be investigated and corrected by the development team.
    """
    name = "Audio Processing Error"
    resolution = "The issue must be investigated and corrected by the development team."
    should_retry = False
    status_code = 500

class ExternalServiceError(WebServiceError):
    """
    Represents an error that occurred in an external service used during the operation.

    - **HTTP Status Code:** 502 Bad Gateway
    - **Client Should Auto-Retry:** False. The issue must be investigated by the development team.
    """
    name = "External Service Error"
    resolution = "The issue must be investigated by the development team."
    should_retry = False
    status_code = 502

    def __init__(self, source: str, message: str):
        super().__init__(message)
        self.source = source

class ExternalServiceInterruption(ExternalServiceError):
    """
    Represents an error that occurred due to temporary loss of an external service.

    - **HTTP Status Code:** 503 Service Unavailable
    - **Client Should Auto-Retry:** True.  The client should wait and then retry the request.
    """
    name = "External Service Unavailable"
    resolution = "This error is due to an interruption in an external service. Please wait and try again."
    should_retry = True
    status_code = 503

class ExternalServiceTimeout(ExternalServiceError):
    """
    Represents an error that occurred due to a timeout on an external service.

    - **HTTP Status Code:** 504 Gateway Timeout
    - **Client Should Auto-Retry:** True.  The client should wait and then retry the request.
    """
    name = "External Service Timeout"
    resolution = "This error is due to a temporary reduction in performance of an external service and should be retried."
    should_retry = True
    status_code = 504