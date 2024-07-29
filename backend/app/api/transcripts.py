import logging
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.audio_processing import standardize_audio, load_file
from app.services.transcription import transcribe_audio
from app.services.measurement import Stopwatch
from app.services.error_handling import AIServiceTimeout, TransientAIServiceError, UnrecoverableAIServiceError
from app.schemas import Transcript

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/create", response_model=Transcript)
async def create(recording: UploadFile = File(...)):
    try:
        audio_data = await recording.read()
    except Exception as e:
        logger.error("Unable to read the provided audio file. Transcription aborted.")
        raise HTTPException(status_code=422, detail={
            "message": "Unable to read the provided audio file. Transcription aborted.",
            "errorDetails": str(e),
        })

    try:
        with Stopwatch() as standardization_timer:
            audio_buffer = standardize_audio(audio_data, recording.filename)

        logger.info(f"Audio standardized ({standardization_timer.elapsed_ms / 1000:.2f}s)")
    except Exception as e:
        logger.warning("Failed to convert audio to a standard format. Attempting to transcribe using original audio data.")
        audio_buffer = load_file(audio_data, recording.filename)

    try:
        with Stopwatch() as transcription_timer:
            transcript = await transcribe_audio(audio_buffer)

        logger.info(f"Transcript generated ({transcription_timer.elapsed_ms / 1000:.2f}s)")
    except AIServiceTimeout as e:
        logger.error(f"AI Service timed out: {str(e)}")
        raise HTTPException(status_code=504, detail={
            "message": "Request timed out. Please wait and try again.",
            "errorDetails": str(e),
        })
    except TransientAIServiceError as e:
        logger.error(f"Request failed due to a temporary problem with the AI Service: {str(e)}")
        raise HTTPException(status_code=503, detail={
            "message": "The AI Service is temporarily unavailable. Please wait and try again.",
            "errorDetails": str(e),
        })
    except UnrecoverableAIServiceError as e:
        logger.error(f"Request failed due to an error in the AI Service: {str(e)}")
        raise HTTPException(status_code=502, detail={
            "message": "An error occurred when communicating with the AI Service. Please report this error so it can be resolved.",
            "errorDetails": str(e),
        })
    except Exception as e:
        logger.error(f"A server error occurred during request: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "message": "A server error occurred. Please report the issue so it can be resolved.",
            "errorDetails": str(e),
        })
    
    return Transcript(
        text=transcript,
        timeToGenerate=transcription_timer.elapsed_ms,
        serviceUsed="OpenAI API",
        modelUsed="whisper-1"
    )
