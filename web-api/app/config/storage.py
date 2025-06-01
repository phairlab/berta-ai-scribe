from app.config import settings
from app.services.adapters import StorageProvider
from app.services.local_storage import local_storage
from app.services.s3_storage import S3StorageProvider

USE_S3_STORAGE = (
    settings.ENVIRONMENT != "development"
    and settings.AWS_ACCESS_KEY_ID is not None
    and settings.AWS_SECRET_ACCESS_KEY is not None
    and settings.S3_BUCKET_NAME is not None
    and settings.AWS_REGION is not None
)

storage_provider: StorageProvider
if USE_S3_STORAGE:
    s3_storage = S3StorageProvider()
    storage_provider = s3_storage
    s3_storage.ensure_storage_exists()
else:
    storage_provider = local_storage
    local_storage.ensure_storage_exists()


def save_recording(file, username: str, filename: str) -> None:
    """Writes a file to the storage system."""
    storage_provider.save_recording(file, username, filename)


def stream_recording(username: str, filename: str):
    """Streams a file from the storage system."""
    return storage_provider.stream_recording(username, filename)


def delete_recording(username: str, filename: str) -> None:
    """Removes a file from the storage system."""
    storage_provider.delete_recording(username, filename)


def get_sample_recording(filename: str):
    """Streams a sample recording file from the storage system."""
    return storage_provider.get_sample_recording(filename)


def list_sample_recordings() -> list[str]:
    """Lists all sample recordings in the storage system."""
    return storage_provider.list_sample_recordings() 