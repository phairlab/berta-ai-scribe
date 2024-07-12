# Application Settings
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', case_sensitive=True)

    APP_NAME: str = "Jenkins AI Scribe"
    APP_VERSION: str = "0.1.1"
    AUDIO_BITRATE: str = "32k"    

settings = Settings()