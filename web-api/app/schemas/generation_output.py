from datetime import datetime

from pydantic import BaseModel

class GenerationOutput(BaseModel):
    text: str
    generatedAt: datetime
    service: str
    model: str
    completionTokens: int
    promptTokens: int
    timeToGenerate: int
