from datetime import datetime

from pydantic import BaseModel

import app.services.db as db

from .recording import Recording
from .draft_note import DraftNote

class Encounter(BaseModel):
    uuid: str
    createdAt: datetime | None
    title: str | None
    recording: Recording
    draftNotes: list[DraftNote]

    @staticmethod
    def from_db_record(record: db.Encounter):
        return Encounter(
            uuid=record.uuid,
            createdAt=record.created_at,
            title=record.title,
            recording=Recording.from_db_record(record.recording),
            draftNotes=[DraftNote.from_db_record(d) for d in record.draft_notes if not d.is_discarded],
        )
    
