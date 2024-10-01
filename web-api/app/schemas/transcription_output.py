from datetime import datetime

from pydantic import BaseModel

class TranscriptionOutput(BaseModel):
    transcript: str
    transcribedAt: datetime
    service: str
    audioDuration: int
    timeToGenerate: int
