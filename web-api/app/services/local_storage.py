import os
from pathlib import Path
from typing import BinaryIO, Generator, Any

from app.config import settings
from app.services.adapters import StorageProvider


class LocalStorageProvider(StorageProvider):
    """Implementation of StorageProvider using the local filesystem."""
    
    def save_recording(self, file: BinaryIO, username: str, filename: str) -> None:
        """Writes a file to a user's recordings folder."""
        user_folder = Path(settings.RECORDINGS_FOLDER, username)
        if not os.path.isdir(user_folder):
            os.makedirs(user_folder, exist_ok=True)

        with open(Path(user_folder, filename), "wb") as recording_file:
            recording_file.write(file.read())

    def stream_recording(self, username: str, filename: str) -> Generator[bytes, Any, None]:
        """Streams a file from the user's recordings folder."""
        user_folder = Path(settings.RECORDINGS_FOLDER, username)
        with open(Path(user_folder, filename), "rb") as recording_file:
            yield from recording_file

    def delete_recording(self, username: str, filename: str) -> None:
        """Removes a file from the user's recordings folder."""
        user_folder = Path(settings.RECORDINGS_FOLDER, username)
        os.remove(Path(user_folder, filename))

    def get_sample_recording(self, filename: str) -> Generator[bytes, Any, None]:
        """Streams a sample recording file."""
        sample_path = Path(".sample-recordings", filename)
        if not sample_path.exists():
            raise FileNotFoundError(f"Sample recording {filename} not found")
        
        with open(sample_path, "rb") as recording_file:
            yield from recording_file

    def list_sample_recordings(self) -> list[str]:
        """Lists all sample recordings."""
        sample_dir = Path(".sample-recordings")
        if not sample_dir.exists():
            return []
        
        return [
            file for file in os.listdir(sample_dir)
            if os.path.isfile(os.path.join(sample_dir, file)) and file.endswith('.mp3')
        ]

    def read_prompt(self, prompt_path: str) -> str:
        """Reads a prompt file from local storage and returns its contents as a string."""
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()

    def list_prompts(self, directory_path: str) -> list[str]:
        """Lists all prompt files in the specified directory."""
        if not os.path.isdir(directory_path):
            return []
        
        prompt_files = []
        for file in os.listdir(directory_path):
            file_path = os.path.join(directory_path, file)
            if os.path.isfile(file_path) and file.endswith('.txt'):
                prompt_files.append(file_path)
        return prompt_files

    def ensure_storage_exists(self) -> None:
        """Ensures that the storage directory exists."""
        if not os.path.isdir(settings.RECORDINGS_FOLDER):
            os.makedirs(settings.RECORDINGS_FOLDER, exist_ok=True)

local_storage = LocalStorageProvider() 