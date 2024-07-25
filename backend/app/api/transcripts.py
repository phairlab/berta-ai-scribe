import logging
import time
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.audio_processing import standardize_audio
from app.services.transcription import transcribe_audio
from app.schemas import Transcript

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/create")
async def create(recording: UploadFile = File(...)):
    try:
        start_time = time.time()

        audio_buffer = standardize_audio(await recording.read(), recording.filename)
        transcript = await transcribe_audio(audio_buffer)

        end_time = time.time()
        transcription_ms = int((end_time - start_time) * 1000)

        logger.info(f"Transcript generated in {transcription_ms / 1000:.2f}s")
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    return Transcript(
        text=transcript,
        timeToGenerate=transcription_ms,
        serviceUsed='OpenAI Whisper API',
    )
