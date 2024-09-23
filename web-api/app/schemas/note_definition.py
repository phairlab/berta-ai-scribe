from datetime import datetime

from pydantic import BaseModel

import app.services.db as db
from app.config import settings

class NoteDefinition(BaseModel):
    uuid: str
    createdAt: datetime
    title: str
    instructions: str
    isBuiltin: bool
    isDefault: bool = False
    isDiscarded: bool = False

    @staticmethod
    def from_db_record(record: db.NoteDefinition):
        return NoteDefinition(
            uuid=record.uuid,
            createdAt=record.created_at,
            title=record.title,
            instructions=record.instructions,
            isBuiltin=record.username == settings.SYSTEM_USER,
            isDefault=record.username == settings.SYSTEM_USER and record.title == settings.DEFAULT_NOTE_DEFINITION,
            isDiscarded=record.is_discarded,
        )