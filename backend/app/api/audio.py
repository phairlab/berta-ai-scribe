import logging
import os
import time
import uuid
from fastapi import APIRouter, File, Response, UploadFile, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from app.services.audio_processing import load_file, standardize_audio

logger = logging.getLogger(__name__)
router = APIRouter()

USER_FILES_FOLDER = ".user-files"

@router.get("/")
async def get_audio_sample(id: str):
    filename = f"{id}.webm"
    path = os.path.join(USER_FILES_FOLDER, filename)

    if not os.path.isfile(path):
        raise HTTPException(status_code=400, detail=f"The file '{id}' does not exist.")
    
    return FileResponse(path)

@router.post("/create")
async def create(recording: UploadFile = File(...)):
    id = uuid.uuid4()

    # audio_buffer = standardize_audio(await recording.read(), recording.filename)
    audio_buffer = load_file(await recording.read(), recording.filename)

    with open(os.path.join(USER_FILES_FOLDER, f"{id}.webm"), "wb") as f:
        f.write(audio_buffer.getbuffer())
    
    return {"id": id}

@router.post("/standardize")
async def standardize(recording: UploadFile = File(...)):
    try:
        start_time = time.time()

        audio_buffer = standardize_audio(await recording.read(), recording.filename)

        end_time = time.time()
        audio_processing_ms = int((end_time - start_time) * 1000)
        
        logger.info(f"Audio file \"{recording.filename}\" standardized in {audio_processing_ms / 1000:.2f}s")
    except Exception as e:
        logger.error(f"Audio processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while reading the audio file.")
    
    headers = {
        "Content-Disposition": f"inline; filename={audio_buffer.name}",
        "Content-Length": f"{audio_buffer.getbuffer().nbytes}",
    }
    response = StreamingResponse(audio_buffer, media_type="audio/mpeg", headers=headers)

    return response
