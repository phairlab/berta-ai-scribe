from datetime import datetime

from pydantic import BaseModel

import app.services.db as db
from app.config import settings

class NoteDefinition(BaseModel):
    id: str
    modified: datetime
    title: str
    instructions: str
    model: str
    isBuiltin: bool
    isSystemDefault: bool = False

    @staticmethod
    def from_db_record(db_record: db.NoteDefinition):
        # Each db record is a version of the definition,
        # so its created datetime represents a modification.
        return NoteDefinition(
            id=db_record.id,
            modified=db_record.created,
            title=db_record.title,
            instructions=db_record.instructions,
            model=db_record.model,
            isBuiltin=db_record.username == settings.SYSTEM_USER,
            isSystemDefault=db_record.username == settings.SYSTEM_USER and db_record.title == settings.DEFAULT_NOTE_DEFINITION,
        )