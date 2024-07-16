import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

SAMPLES_FOLDER = ".audio-samples"

@router.get("/list")
async def list_audio_samples():
    samples = [Path(f).stem for f in os.listdir(SAMPLES_FOLDER) if os.path.isfile(os.path.join(SAMPLES_FOLDER, f))]

    return samples

@router.get("/")
async def get_audio_sample(id: str):
    filename = f"{id}.mp3"
    path = os.path.join(SAMPLES_FOLDER, filename)

    if not os.path.isfile(path):
        raise HTTPException(status_code=400, detail=f"The sample file '{id}' does not exist.")
    
    return FileResponse(path)
