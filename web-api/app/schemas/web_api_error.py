from pydantic import BaseModel

from .simple_message import SimpleMessage
from .web_api_error_detail import WebAPIErrorDetail


class WebAPIError(BaseModel):
    detail: SimpleMessage | WebAPIErrorDetail
