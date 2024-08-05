from pathlib import Path

from fastapi import APIRouter, UploadFile

from app.config import get_app_logger, settings
from app.services.audio_processing import split_audio
from app.services.ai import transcribe_audio
from app.services.measurement import ExecutionTimer, MB_to_bytes, bytes_to_MB
from app.services.error_handling import APIError, AIServiceTimeout, AudioProcessingError, TransientAIServiceError, AIServiceError, UnsupportedMediaFormat
from app.schemas import Transcript, APIErrorReport

logger = get_app_logger(__name__)

router = APIRouter()

@router.post("", response_model=Transcript, responses={
    500: {"description": "Internal Server Error", "model": APIErrorReport},
    502: {"description": "AI Service Error", "model": APIErrorReport},
    503: {"description": "AI Service Unavailable", "model": APIErrorReport},
    504: {"description": "AI Service Timeout", "model": APIErrorReport},
})
async def create_transcript(recording: UploadFile):
    logger.debug("Generating transcription")

    try:
        # Transcription cannot be performed on files > 25 MB.        
        if recording.size <= MB_to_bytes(1):
            # Process the file directly.
            with ExecutionTimer() as transcription_timer:
                transcript = await transcribe_audio(recording.file, recording.filename, recording.content_type, timeout=settings.TRANSCRIPTION_TIMEOUT)
        else:
            logger.warning(f"File is {bytes_to_MB(recording.size):.2f} MB and will be split for transcribing.")

            with ExecutionTimer() as transcription_timer:
                try:
                    partial_transcripts = []

                    for (i, segment) in enumerate(split_audio(recording.file)):
                        logger.debug(f"Transcribing segment {i+1}")

                        (file, audio_format) = segment
                        content_type = f"audio/{"mpeg" if audio_format == "mp3" else audio_format}"
                        filename = f"{Path(recording.filename).stem}-{i:>03}.{audio_format}"
                        prompt = partial_transcripts[i-1] if i > 1 else None

                        partial_transcript = await transcribe_audio(file, filename, content_type, prompt, timeout=settings.TRANSCRIPTION_TIMEOUT)                        
                        partial_transcripts.append(partial_transcript)

                    transcript = " ".join(partial_transcripts)
                except Exception as e:
                    raise e

        logger.debug(f"Transcript generated in {transcription_timer.elapsed_ms / 1000:.2f}s")
    
        return Transcript(
            text=transcript,
            timeToProcessAudio=0,
            timeToGenerate=transcription_timer.elapsed_ms,
            serviceUsed="OpenAI API",
            modelUsed="whisper-1"
        )
    except (AudioProcessingError, AIServiceError, AIServiceTimeout, TransientAIServiceError) as e:
        raise e.to_http_exception()
    except Exception as e:
        logger.error(e)
        raise APIError(str(e)).to_http_exception()
