import os
import json
from pathlib import Path

from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse

import app.schemas as sch
import app.services.error_handling as errors
from app.services.security import authenticate_user

router = APIRouter(dependencies=[Depends(authenticate_user)])

SAMPLES_DIRECTORY = ".sample-recordings"

@router.get("")
def list_samples() -> list[sch.SampleRecording]:
    with open(".sample-recordings/transcripts.json", "r", encoding="utf-8") as f:
        file_text = f.read()

    transcripts = json.loads(file_text)
    filenames = [f for f in os.listdir(SAMPLES_DIRECTORY) if os.path.isfile(os.path.join(SAMPLES_DIRECTORY, f)) and Path(f).suffix == ".mp3"]
    
    samples = [sch.SampleRecording(filename=f, transcript=transcripts[f]) for f in filenames]
    return samples

@router.get("/{filename}", responses={
    status.HTTP_404_NOT_FOUND: {"description": "Not Found", "model": sch.WebAPIError},
})
def download_sample(filename: str) -> FileResponse:
    filepath = os.path.join(SAMPLES_DIRECTORY, filename)
    if not os.path.isfile(filepath):
        raise errors.NotFound("Recording not found")
    
    return FileResponse(filepath)

@router.get("/{filename}/transcript")
def get_sample_transcript(filename: str) -> sch.TextResponse:
    with open(".sample-recordings/transcripts.json", "r", encoding="utf-8") as f:
        file_text = f.read()

    transcripts = json.loads(file_text)

    return sch.TextResponse(text=transcripts[filename])
