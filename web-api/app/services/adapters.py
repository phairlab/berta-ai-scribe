from abc import ABC, abstractmethod
from typing import BinaryIO, Generator, Any

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


class StorageProvider(ABC):
    @abstractmethod
    def save_recording(self, file: BinaryIO, username: str, filename: str) -> None:
        """Saves a recording file to storage."""
        pass
    
    @abstractmethod
    def stream_recording(self, username: str, filename: str) -> Generator[bytes, Any, None]:
        """Streams a recording file from storage."""
        pass
    
    @abstractmethod
    def delete_recording(self, username: str, filename: str) -> None:
        """Deletes a recording file from storage."""
        pass
    
    @abstractmethod
    def get_sample_recording(self, filename: str) -> Generator[bytes, Any, None]:
        """Streams a sample recording file from storage."""
        pass
    
    @abstractmethod
    def list_sample_recordings(self) -> list[str]:
        """Lists all sample recordings in storage."""
        pass
    
    @abstractmethod
    def read_prompt(self, prompt_path: str) -> str:
        """Reads a prompt file from storage and returns its contents as a string."""
        pass
    
    @abstractmethod
    def list_prompts(self, directory_path: str) -> list[str]:
        """Lists all prompt files in the specified directory."""
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
