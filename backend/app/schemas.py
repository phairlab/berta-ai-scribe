from pydantic import BaseModel

class AudioInfo(BaseModel):
    duration: int
    fileSize: int

class Transcript(BaseModel):
    generationTime: int
    method: str
    text: str

class GeneratedNote(BaseModel):
    generationTime: int
    model: str
    text: str

class PatientConversation(BaseModel):
    audio: AudioInfo
    transcript: Transcript
    generatedNote: GeneratedNote