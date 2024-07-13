from pydantic import BaseModel

class Transcript(BaseModel):
    generationTime: int
    method: str
    text: str

class GeneratedNote(BaseModel):
    generationTime: int
    model: str
    text: str