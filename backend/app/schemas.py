from pydantic import BaseModel

class Transcript(BaseModel):
    text: str
    serviceUsed: str
    timeToGenerate: int

class GeneratedNote(BaseModel):
    text: str
    noteType: str
    serviceUsed: str
    modelUsed: str
    timeToGenerate: int