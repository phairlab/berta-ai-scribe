import logging
from typing import Literal

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load the .env settings into environment variables
load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "Jenkins AI Scribe"
    APP_VERSION: str = "0.1.1"

    AUDIO_FORMAT: str = "webm"
    AUDIO_BITRATE: str = "32k"
    LOGGING_LEVEL: str = "info"

    OPENAI_API_KEY: str

    SNOWFLAKE_TOKEN_PATH: str = "/snowflake/session/token"
    SNOWFLAKE_ACCOUNT: str
    SNOWFLAKE_HOST: str | None = None
    SNOWFLAKE_CONNECTION_NAME: str | None = None
    SNOWFLAKE_ROLE: str
    SNOWFLAKE_DATABASE: str
    SNOWFLAKE_SCHEMA: str
    SNOWFLAKE_WAREHOUSE: str

    GENERATIVE_AI_SERVICE: Literal["OPENAI", "SNOWFLAKE_CORTEX"] = "OPENAI"
    GENERATIVE_AI_MODEL: str = "gpt-4o"
    TRANSCRIPTION_SERVICE: Literal["OPENAI", "LOCAL_WHISPER"] = "OPENAI"
    LOCAL_WHISPER_SERVICE_URL: str | None = None

    model_config = SettingsConfigDict(env_file='.env', case_sensitive=True)    

settings = Settings()

def get_app_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.level = logging.getLevelNamesMapping()[settings.LOGGING_LEVEL.upper()]
    return logger