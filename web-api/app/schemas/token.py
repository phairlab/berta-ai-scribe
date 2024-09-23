from pydantic import BaseModel

class Token(BaseModel):
    accessToken: str
    tokenType: str