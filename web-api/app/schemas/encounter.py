from datetime import datetime

from pydantic import BaseModel

from .draft_note import DraftNote
from .recording import Recording


class Encounter(BaseModel):
    id: str
    created: datetime
    modified: datetime
    label: str | None
    autolabel: str | None
    recording: Recording
    draftNotes: list[DraftNote]
