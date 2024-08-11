from pydantic import BaseModel

class ErrorDetail(BaseModel):
    name: str
    message: str
    shouldRetry: bool

class ErrorReport(BaseModel):
    detail: ErrorDetail

class Message(BaseModel):
    message: str

class Transcript(BaseModel):
    text: str

class GeneratedNote(BaseModel):
    text: str

class NoteGenerationParameters(BaseModel):
    transcript: str
    noteType: str

