from pydantic import BaseModel


class TranscriptionOutput(BaseModel):
    transcript: str
    service: str
