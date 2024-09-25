from pydantic import BaseModel

class WebAPISession(BaseModel):
    username: str
    sessionId: str
    rights: list[str] = []
    defaultNoteType: str | None = None
