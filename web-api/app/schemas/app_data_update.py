from pydantic import BaseModel

from .encounter import Encounter

class AppDataUpdate(BaseModel):
    newEncounters: list[Encounter]
