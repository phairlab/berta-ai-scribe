from datetime import datetime

from pydantic import BaseModel

import app.services.db as db

class UserInfo(BaseModel):
    username: str
    updated: datetime
    defaultNoteType: str | None

    @staticmethod
    def from_db_record(db_record: db.User):
        return UserInfo(
            username=db_record.username,
            updated=db_record.updated,
            defaultNoteType=db_record.default_note,
        )
