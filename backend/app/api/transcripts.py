import logging
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.audio_processing import standardize_audio, load_file
from app.services.transcription import transcribe_audio
from app.services.measurement import Stopwatch
from app.services.error_handling import AIServiceTimeout, TransientAIServiceError, AIServiceError
from app.schemas import Transcript

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/create", response_model=Transcript, responses={
    415: {"description": "Unsupported Media Type: File is not a supported audio type"},
    500: {"description": "Internal Server Error"},
    502: {"description": "Bad Gateway: Error reported by AI Service"},
    503: {"description": "Service Unavailable: AI Service temporarily unavailable"},
    504: {"description": "Gateway Timeout: AI Service timeout"},
})
async def create(recording: UploadFile = File(...)):
    # Read the provided file and convert into a standard size/bitrate/format.
    # This step also enforces that the file is of a supported audio format before sending for transcription.
    try:
        audio_data = await recording.read()

        with Stopwatch() as standardization_timer:
            audio_buffer = standardize_audio(audio_data, recording.filename)

        logger.info(f"Audio standardized ({standardization_timer.elapsed_ms / 1000:.2f}s)")
    except Exception as e:
        logger.error(f"Unable to read the provided audio file. Request aborted. Details: {str(e)}")
        raise HTTPException(status_code=415, detail={
            "message": "Unable to read the provided audio file. Request aborted.",
            "errorDetails": str(e),
        })

    # Perform transcription using the AI Service.
    try:
        with Stopwatch() as transcription_timer:
            transcript = await transcribe_audio(audio_buffer)

        logger.info(f"Transcript generated ({transcription_timer.elapsed_ms / 1000:.2f}s)")
    except AIServiceTimeout as e:
        logger.error(f"AI Service timed out: {str(e)}")
        raise HTTPException(status_code=504, detail={
            "message": "Request timed out.",
            "errorDetails": str(e),
        })
    except TransientAIServiceError as e:
        logger.error(f"Request failed due to a temporary problem with the AI Service: {str(e)}")
        raise HTTPException(status_code=503, detail={
            "message": "The AI Service is temporarily unavailable.",
            "errorDetails": str(e),
        })
    except AIServiceError as e:
        logger.error(f"The AI Service reported an error: {str(e)}")
        raise HTTPException(status_code=502, detail={
            "message": "The AI Service reported an error.",
            "errorDetails": str(e),
        })
    except Exception as e:
        logger.error(f"A server error occurred during the request: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "message": "A server error occurred.",
            "errorDetails": str(e),
        })
    
    return Transcript(
        text=transcript,
        timeToGenerate=transcription_timer.elapsed_ms,
        serviceUsed="OpenAI API",
        modelUsed="whisper-1"
    )
