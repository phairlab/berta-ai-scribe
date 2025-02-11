from datetime import datetime

from pydantic import BaseModel

from .llm_manifest import LlmManifest


class UserInfo(BaseModel):
    username: str
    updated: datetime
    defaultNoteType: str | None
    availableLlms: LlmManifest
