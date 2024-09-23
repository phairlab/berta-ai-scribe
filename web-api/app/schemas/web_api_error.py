from pydantic import BaseModel

from app.schemas import SimpleMessage, WebAPIErrorDetail

class WebAPIError(BaseModel):
    detail: SimpleMessage | WebAPIErrorDetail