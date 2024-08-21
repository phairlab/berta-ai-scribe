import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import get_app_logger

logger = get_app_logger(__name__)

router = APIRouter()

SAMPLES_DIRECTORY = ".sample-recordings"

@router.get("")
async def list_samples() -> list[str]:
    samples = [f for f in os.listdir(SAMPLES_DIRECTORY) if os.path.isfile(os.path.join(SAMPLES_DIRECTORY, f))]
    return samples

@router.get("/{filename}")
async def download_sample(filename: str) -> FileResponse:
    filepath = os.path.join(SAMPLES_DIRECTORY, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Sample not found")
    
    return FileResponse(filepath)