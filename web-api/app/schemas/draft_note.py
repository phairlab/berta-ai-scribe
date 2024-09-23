from datetime import datetime

from pydantic import BaseModel

import app.services.db as db

class DraftNote(BaseModel):
    uuid: str
    noteDefinitionUuid: str
    createdAt: datetime
    tag: str
    title: str
    text: str
    generationService: str
    model: str
    timeToGenerate: int
    isDiscarded: bool

    @staticmethod
    def from_db_record(record: db.DraftNote):
        return DraftNote(
            uuid=record.uuid,
            noteDefinitionUuid=record.note_definition.uuid,
            createdAt=record.created_at,
            tag=record.tag,
            title=record.title,
            text=record.text,
            generationService=record.generation_service,
            model=record.model,
            timeToGenerate=record.time_to_generate,
            isDiscarded=record.is_discarded,
        )