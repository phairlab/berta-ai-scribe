from pydantic import BaseModel


class WebAPIErrorDetail(BaseModel):
    errorId: str
    name: str
    message: str
    fatal: bool
