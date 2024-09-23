from pydantic import BaseModel

class SampleRecording(BaseModel):
    filename: str
    transcript: str
