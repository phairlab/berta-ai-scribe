from typing import Literal

from pydantic import BaseModel


class LanguageModel(BaseModel):
    name: str
    size: Literal["Large", "Medium", "Small"]
