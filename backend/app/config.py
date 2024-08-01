from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load the .env settings into environment variables
load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "Jenkins AI Scribe"
    APP_VERSION: str = "0.1.1"
    SUPPORTED_AUDIO_TYPES: list[str] = ["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "wav", "webm"]
    AUDIO_FORMAT: str = "webm"
    AUDIO_BITRATE: str = "32k"
    TRANSCRIPTION_TIMEOUT: int = 60
    SUMMARIZATION_TIMEOUT: int = 60
    OPENAI_API_KEY: str

    model_config = SettingsConfigDict(env_file='.env', case_sensitive=True)    

settings = Settings()