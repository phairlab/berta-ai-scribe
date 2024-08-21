from pydantic import BaseModel

class ErrorDetail(BaseModel):
    name: str
    message: str
    shouldRetry: bool

class ErrorReport(BaseModel):
    detail: ErrorDetail

class Message(BaseModel):
    message: str

class NoteInstructionsId(BaseModel):
    is_builtin: bool
    id: int

class NoteInstructions(BaseModel):
    instruction_id: NoteInstructionsId
    title: str
    instructions: str

class User(BaseModel):
    id: int
    username: str
    default_note: NoteInstructionsId

class Transcript(BaseModel):
    text: str

class GeneratedNote(BaseModel):
    text: str
    title: str

class NoteGenerationParameters(BaseModel):
    transcript: str
    noteType: str
