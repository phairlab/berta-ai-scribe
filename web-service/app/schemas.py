from pydantic import BaseModel

class APIErrorDetail(BaseModel):
    name: str
    message: str
    shouldRetry: bool

class APIErrorReport(BaseModel):
    detail: APIErrorDetail

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