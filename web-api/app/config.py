from typing import Literal

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load the .env settings into environment variables
load_dotenv()

class Settings(BaseSettings):
    ENVIRONMENT: Literal["production", "development"] = "production"
    APP_NAME: str = "AHS \"Jenkins\" Scribe"
    APP_VERSION: str = "0.3.3"

    DEFAULT_AUDIO_FORMAT: str = "mp3"
    DEFAULT_AUDIO_BITRATE: str = "96k"
    LOGGING_LEVEL: str = "info"

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    OPENAI_API_KEY: str = ""

    SNOWFLAKE_TOKEN_PATH: str = "/snowflake/session/token"
    SNOWFLAKE_ACCOUNT: str
    SNOWFLAKE_HOST: str | None = None
    SNOWFLAKE_ROLE: str
    SNOWFLAKE_DATABASE: str
    SNOWFLAKE_SCHEMA: str
    SNOWFLAKE_WAREHOUSE: str
    SNOWFLAKE_USERNAME: str | None = None

    SYSTEM_USER: str = "BUILTIN"
    DEFAULT_NOTE_DEFINITION: str = "Full Visit"
    RECORDINGS_FOLDER: str = ".recordings"

    GENERATIVE_AI_SERVICE: Literal["OPENAI", "SNOWFLAKE_CORTEX"] = "OPENAI"
    GENERATIVE_AI_MODEL: str = "gpt-4o"
    TRANSCRIPTION_SERVICE: Literal["OPENAI", "LOCAL_WHISPER"] = "OPENAI"
    LOCAL_WHISPER_SERVICE_URL: str | None = None
    
    ENCOUNTERS_PAGE_SIZE: int = 15

    model_config = SettingsConfigDict(env_file='.env', case_sensitive=True)    

settings = Settings()