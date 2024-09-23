from pydantic import BaseModel

class GenerationResponse(BaseModel):
    text: str
    tag: str