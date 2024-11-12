from datetime import datetime

from pydantic import BaseModel

import app.services.db as db
from .note_output_types import NoteOutputType

class DraftNote(BaseModel):
    id: str
    definitionId: str
    created: datetime
    title: str
    content: str
    outputType: NoteOutputType

    @staticmethod
    def from_db_record(db_record: db.DraftNote):
        return DraftNote(
            id=db_record.id,
            definitionId=db_record.definition_id,
            created=db_record.created,
            title=db_record.title,
            content=db_record.content,
            outputType=db_record.output_type,
        )