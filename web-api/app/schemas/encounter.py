from datetime import datetime

from pydantic import BaseModel

import app.services.db as db

from .recording import Recording
from .draft_note import DraftNote

class Encounter(BaseModel):
    id: str
    created: datetime
    modified: datetime
    label: str | None
    summary: str | None
    recording: Recording
    draftNotes: list[DraftNote]

    @staticmethod
    def from_db_record(db_record: db.Encounter):
        return Encounter(
            id=db_record.id,
            created=db_record.created,
            modified=db_record.modified,
            label=db_record.label,
            summary=db_record.summary,
            recording=Recording.from_db_record(db_record.recording),
            draftNotes=[DraftNote.from_db_record(d) for d in db_record.draft_notes if d.inactivated is None],
        )
    
