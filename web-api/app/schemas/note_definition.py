from datetime import datetime

from pydantic import BaseModel

import app.services.db as db
from app.config import settings

class NoteDefinition(BaseModel):
    id: str
    created: datetime
    title: str
    instructions: str
    model: str
    isBuiltin: bool
    isSystemDefault: bool = False

    @staticmethod
    def from_db_record(db_record: db.NoteDefinition):
        return NoteDefinition(
            id=db_record.id,
            created=db_record.created,
            title=db_record.title,
            instructions=db_record.instructions,
            model=db_record.model,
            isBuiltin=db_record.username == settings.SYSTEM_USER,
            isSystemDefault=db_record.username == settings.SYSTEM_USER and db_record.title == settings.DEFAULT_NOTE_DEFINITION,
        )