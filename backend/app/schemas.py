from pydantic import BaseModel

class ErrorDetail(BaseModel):
    message: str
    shouldRetry: bool
    details: str

class ErrorReport(BaseModel):
    detail: ErrorDetail

class Message(BaseModel):
    message: str

class Transcript(BaseModel):
    text: str
    timeToProcessAudio: int
    timeToGenerate: int
    serviceUsed: str
    modelUsed: str

class GeneratedNote(BaseModel):
    text: str
    noteType: str
    timeToGenerate: int
    serviceUsed: str
    modelUsed: str