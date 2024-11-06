from uuid import uuid4

from fastapi import status

class WebAPIException(Exception):
    """
    Represents an unknown error that occurred within the web service.

    - **HTTP Status Code:** 500 Internal Server Error
    """
    name: str = "Unexpected Error"
    source: str = "Server"
    message: str
    uuid: str
    retry: bool = False
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    headers: dict = {}

    def __init__(self, message: str):
        super().__init__(message)
        self.uuid = str(uuid4())
        self.message = message

    def __str__(self) -> str:
        return self.message

class BadRequest(WebAPIException):
    """
    Represents an error that occurred due to a client error.

    - **HTTP Status Code:** 400 Bad Request
    """
    name = "Bad Request"
    status_code = status.HTTP_400_BAD_REQUEST

class Unauthorized(WebAPIException):
    """
    An attempt to access data without a valid authenticated user session.

    - **HTTP Status Code:** 401 Unauthorized
    """
    name = "Unauthorized"
    status_code = status.HTTP_401_UNAUTHORIZED
    headers = { "WWW-Authenticate": "Bearer" }

class Forbidden(WebAPIException):
    """
    The current user does not have permission to perform this action.

    - **HTTP Status Code:** 401 Unauthorized
    """
    name = "Unauthorized"
    status_code = status.HTTP_403_FORBIDDEN

class NotFound(WebAPIException):
    """
    Represents an error that occurred due to a requested entity not being found.

    - **HTTP Status Code:** 415 Unsupported Media Type
    """
    name = "Not Found"
    status_code = status.HTTP_404_NOT_FOUND

class UnsupportedAudioFormat(WebAPIException):
    """
    Represents an error that occurred due to an audio file being provided in an unsupported format.

    - **HTTP Status Code:** 415 Unsupported Media Type
    """
    name = "Unsupported File Type"
    status_code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE

class AudioProcessingError(WebAPIException):
    """
    Represents an error that occurred during audio processing.

    - **HTTP Status Code:** 500 Internal Server Error
    """
    name = "Audio Processing Error"
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

class DatabaseError(WebAPIException):
    """
    Represents an error that occurred while saving or loading data.

    - **HTTP Status Code:** 500 Internal Server Error
    """
    name = "Database Error"
    source = "Database"
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

class ExternalServiceError(WebAPIException):
    """
    Represents an error that occurred in an external service used during the operation.

    - **HTTP Status Code:** 502 Bad Gateway
    """
    status_code = status.HTTP_502_BAD_GATEWAY

    def __init__(self, source: str, message: str):
        super().__init__(message)
        self.name = f"External Service Error: {source}"
        self.source = source

class ExternalServiceInterruption(ExternalServiceError):
    """
    Represents an error that occurred due to temporary loss of an external service.
    This error is likely temporary and the operation should be retried.

    - **HTTP Status Code:** 503 Service Unavailable
    """
    name = "External Service Unavailable"
    retry = True
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE

class ExternalServiceTimeout(ExternalServiceError):
    """
    Represents an error that occurred due to a timeout on an external service.

    - **HTTP Status Code:** 504 Gateway Timeout
    - **Client Should Retry:** True.  The client should wait and then retry the request.
    """
    name = "External Service Timeout"
    retry = True
    status_code = status.HTTP_504_GATEWAY_TIMEOUT