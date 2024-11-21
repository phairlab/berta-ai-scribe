from datetime import datetime

from pydantic import BaseModel

from .encounter import Encounter

class DataChanges(BaseModel):
    lastUpdate: datetime
    newEncounters: list[Encounter]
