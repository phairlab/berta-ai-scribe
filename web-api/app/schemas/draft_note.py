from datetime import datetime

from pydantic import BaseModel

from .note_output_types import NoteOutputType


class DraftNote(BaseModel):
    id: str
    definitionId: str
    created: datetime
    title: str
    model: str
    content: str
    outputType: NoteOutputType
    isFlagged: bool
    comments: str | None
