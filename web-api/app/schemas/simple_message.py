from pydantic import BaseModel

class SimpleMessage(BaseModel):
    message: str