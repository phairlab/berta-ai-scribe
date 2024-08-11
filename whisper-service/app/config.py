from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
import torch

# Load the .env settings into environment variables
load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "Jenkins Transcription Service"
    APP_VERSION: str = "0.1.0"
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    BATCH_SIZE: int = 16
    COMPUTE_TYPE: str = "float16" if torch.cuda.is_available() else "int8"
    MODEL_VERSION: str = "large-v2"

    model_config = SettingsConfigDict(env_file='.env', case_sensitive=True)    

settings = Settings()