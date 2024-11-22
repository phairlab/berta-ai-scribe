from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

from .user_info import UserInfo
from .encounter import Encounter
from .note_definition import NoteDefinition

T = TypeVar("T")

class ChangedEntities(BaseModel, Generic[T]):
    created: list[T]
    modified: list[T]
    removed: list[T]

class DataChanges(BaseModel):
    lastUpdate: datetime
    userInfo: UserInfo | None
    noteDefinitions: ChangedEntities[NoteDefinition]
    encounters: ChangedEntities[Encounter]
