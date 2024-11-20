from pydantic import BaseModel

from .encounter import Encounter

class DataChanges(BaseModel):
    newEncounters: list[Encounter]
