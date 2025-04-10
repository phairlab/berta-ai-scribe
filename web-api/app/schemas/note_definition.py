from datetime import datetime

from pydantic import BaseModel

from .note_output_types import NoteOutputType


class NoteDefinition(BaseModel):
    id: str
    modified: datetime
    category: str
    title: str
    instructions: str
    model: str
    isBuiltin: bool
    isSystemDefault: bool = False
    outputType: NoteOutputType
