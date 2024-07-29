from pydantic import BaseModel

class Transcript(BaseModel):
    text: str
    timeToGenerate: int
    serviceUsed: str
    modelUsed: str

class GeneratedNote(BaseModel):
    text: str
    noteType: str
    timeToGenerate: int
    serviceUsed: str
    modelUsed: str