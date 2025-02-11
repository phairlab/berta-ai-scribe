from typing import Literal

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load the .env settings into environment variables
load_dotenv()


class Settings(BaseSettings):
    ENVIRONMENT: Literal["production", "development"] = "production"
    APP_NAME: str = 'AHS "Jenkins" Scribe'
    APP_VERSION: str = "0.6.0"

    DEFAULT_AUDIO_FORMAT: str = "mp3"
    DEFAULT_AUDIO_BITRATE: str = "96k"
    LOGGING_LEVEL: str = "info"

    DATA_FOLDER: str = ".data"
    RECORDINGS_FOLDER: str = f"{DATA_FOLDER}/recordings"
    DEV_DATABASE_FILE: str = f"{DATA_FOLDER}/database.db"

    PROMPTS_FOLDER: str = ".prompts"
    BUILTIN_NOTETYPES_FOLDER: str = f"{PROMPTS_FOLDER}/note-types"

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    SYSTEM_USER: str = "BUILTIN"
    DEFAULT_NOTE_DEFINITION: str = "Full Visit"

    DEFAULT_NOTE_GENERATION_MODEL: str = "gpt-4o"
    LABEL_MODEL: str = "gpt-4o"
    TRANSCRIPTION_SERVICE: Literal["OpenAI Whisper", "WhisperX"] = "OpenAI Whisper"
    LOCAL_WHISPER_SERVICE_URL: str | None = None

    ENCOUNTERS_PAGE_SIZE: int = 15

    OPENAI_API_KEY: str | None = None

    SNOWFLAKE_TOKEN_PATH: str = "/snowflake/session/token"
    SNOWFLAKE_HOST: str | None = None
    SNOWFLAKE_USERNAME: str | None = None
    SNOWFLAKE_ROLE: str | None = None

    SNOWFLAKE_ACCOUNT: str | None = None
    SNOWFLAKE_DATABASE: str | None = None
    SNOWFLAKE_SCHEMA: str | None = None
    SNOWFLAKE_WAREHOUSE: str | None = None

    AZURE_TENANT_ID: str | None = None
    AZURE_CLIENT_ID: str | None = None
    AZURE_CLIENT_SECRET: str | None = None
    AZURE_API_VERSION: str | None = None
    AZURE_OPENAI_ENDPOINT: str | None = None

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()  # type: ignore

is_cortex_supported: bool = settings.SNOWFLAKE_ACCOUNT is not None
is_openai_supported: bool = settings.OPENAI_API_KEY is not None
is_azure_cognitive_supported: bool = settings.AZURE_TENANT_ID is not None
