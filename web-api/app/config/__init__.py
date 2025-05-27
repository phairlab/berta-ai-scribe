from typing import Literal

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load the .env settings into environment variables
load_dotenv()


class Settings(BaseSettings):
    ENVIRONMENT: Literal["production", "development"] = "production"
    APP_NAME: str = ' "Jenkins" Scribe'
    APP_VERSION: str = "0.6.0"

    DEFAULT_AUDIO_FORMAT: str = "mp3"
    DEFAULT_AUDIO_BITRATE: str = "96k"
    LOGGING_LEVEL: str = "info"
    COOKIE_SECURE: bool = True

    DATA_FOLDER: str = ".data"
    RECORDINGS_FOLDER: str = f"{DATA_FOLDER}/recordings"
    DEV_DATABASE_FILE: str = f"{DATA_FOLDER}/database.db"

    PROMPTS_FOLDER: str = ".prompts"
    BUILTIN_NOTETYPES_FOLDER: str = f"{PROMPTS_FOLDER}/builtin-note-types"

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    SYSTEM_USER: str = "BUILTIN"
    DEFAULT_NOTE_DEFINITION: str = "Full Visit"

    DEFAULT_NOTE_GENERATION_MODEL: str = "llama3.1:8b"
    LABEL_MODEL: str = "llama3.1:8b"
    
    TRANSCRIPTION_SERVICE: Literal["OpenAI Whisper", "WhisperX", "AWS Transcribe", "Parakeet MLX"] = (
        "Parakeet MLX"
    )
    GENERATIVE_AI_SERVICE: Literal["Ollama", "Cortex", "Azure Cognitive", "OpenAI", "AWS Bedrock"] = "Ollama"
    LOCAL_WHISPER_SERVICE_URL: str | None = None

    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_REGION: str = "us-west-2"
    S3_BUCKET_NAME: str = "jenkins-ahs"
    AWS_SECRET_NAME: str | None = None

    # Google authentication settings
    USE_GOOGLE_AUTH: bool = False
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str | None = None

    # Cognito settings
    USE_COGNITO: bool = True
    COGNITO_USER_POOL_ID: str | None = None
    COGNITO_CLIENT_ID: str | None = None
    COGNITO_CLIENT_SECRET: str | None = None
    COGNITO_DOMAIN: str | None = None
    COGNITO_REDIRECT_URI: str | None = None
    
    USE_COGNITO: bool = True
    COGNITO_USER_POOL_ID: str | None = None
    COGNITO_CLIENT_ID: str | None = None
    COGNITO_CLIENT_SECRET: str | None = None
    COGNITO_DOMAIN: str | None = None
    COGNITO_REDIRECT_URI: str | None = None

    ENCOUNTERS_PAGE_SIZE: int = 15

    OPENAI_API_KEY: str | None = None

    USE_AURORA: bool = True
    AURORA_WRITER_ENDPOINT: str | None = None
    DB_NAME: str | None = None
    DB_USER: str | None = None
    DB_PASSWORD: str | None = None
    DB_PORT: int = 5432

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()  # type: ignore

is_openai_supported: bool = settings.OPENAI_API_KEY is not None
is_aws_bedrock_supported = (
    bool(settings.AWS_ACCESS_KEY_ID)
    and bool(settings.AWS_SECRET_ACCESS_KEY)
    and bool(settings.AWS_REGION)
)
is_aws_transcribe_supported: bool = (
    settings.AWS_ACCESS_KEY_ID is not None
    and settings.AWS_SECRET_ACCESS_KEY is not None
)
is_cognito_supported: bool = (
    settings.USE_COGNITO
    and settings.COGNITO_USER_POOL_ID is not None
    and settings.COGNITO_CLIENT_ID is not None
)
