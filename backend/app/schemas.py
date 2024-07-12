from pydantic import BaseModel

class AudioInfo(BaseModel):
    duration: int
    file_size: int

class Transcript(BaseModel):
    generation_time: int
    method: str
    text: str

class GeneratedNote(BaseModel):
    generation_time: int
    model: str
    text: str

class PatientConversation(BaseModel):
    audio: AudioInfo
    transcript: Transcript
    generated_note: GeneratedNote