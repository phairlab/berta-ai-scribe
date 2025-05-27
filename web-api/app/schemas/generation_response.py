from pydantic import BaseModel


class GenerationResponse(BaseModel):
    text: str
    noteId: str
