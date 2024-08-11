from pydantic import BaseModel

class Message(BaseModel):
    message: str

class Transcript(BaseModel):
    text: str
    modelUsed: str