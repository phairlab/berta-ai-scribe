from pydantic import BaseModel

class WebAPIErrorDetail(BaseModel):
    name: str
    message: str
    fatal: bool