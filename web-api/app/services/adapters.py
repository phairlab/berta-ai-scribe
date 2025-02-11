from abc import ABC, abstractmethod
from typing import BinaryIO

from sqlalchemy import Engine as SqlAlchemyEngine
from sqlalchemy.orm import Session as SqlAlchemySession
from sqlalchemy.types import TypeEngine

from app.schemas import GenerationOutput, LanguageModel
from app.schemas.transcription_output import TranscriptionOutput


class DatabaseProvider(ABC):
    @property
    @abstractmethod
    def datetime_type(self) -> type[TypeEngine]:
        pass

    @staticmethod
    @abstractmethod
    def create_engine() -> SqlAlchemyEngine:
        pass

    @staticmethod
    @abstractmethod
    def next_guid(database: SqlAlchemySession) -> int:
        pass


class TranscriptionService(ABC):
    @property
    @abstractmethod
    def service_name(self) -> str:
        pass

    @abstractmethod
    async def transcribe(
        self,
        audio_file: BinaryIO,
        filename: str,
        content_type: str,
        prompt: str | None = None,
    ) -> TranscriptionOutput:
        pass


class GenerativeAIService(ABC):
    @property
    @abstractmethod
    def service_name(self) -> str:
        pass

    @property
    @abstractmethod
    def models(self) -> list[LanguageModel]:
        pass

    @abstractmethod
    def complete(
        self,
        model: str,
        messages: str | list[dict[str, str]],
        temperature: int = 0,
    ) -> GenerationOutput:
        pass
