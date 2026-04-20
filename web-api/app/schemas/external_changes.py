from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

from .encounter import Encounter
from .note_definition import NoteDefinition
from .user_info import UserInfo

T = TypeVar("T")


class ExternalChanges(BaseModel, Generic[T]):
    created: list[T]
    modified: list[T]
    removed: list[T]


class ExternalChangeUpdate(BaseModel):
    lastUpdate: datetime
    userInfo: UserInfo | None
    noteDefinitions: ExternalChanges[NoteDefinition]
    encounters: ExternalChanges[Encounter]
