from datetime import datetime

from pydantic import BaseModel

import app.services.db as db

class DraftNote(BaseModel):
    id: str
    definitionId: str
    definitionVersion: str
    created: datetime
    title: str
    content: str

    @staticmethod
    def from_db_record(db_record: db.DraftNote):
        return DraftNote(
            id=db_record.id,
            definitionId=db_record.definition_id,
            definitionVersion=db_record.definition_version,
            created=db_record.created,
            title=db_record.title,
            content=db_record.content
        )