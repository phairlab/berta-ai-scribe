from pydantic import BaseModel

from .language_model import LanguageModel


class LlmManifest(BaseModel):
    models: list[LanguageModel]
    recommended: str
