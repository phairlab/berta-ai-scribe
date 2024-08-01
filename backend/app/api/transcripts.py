import logging
from pathlib import Path

from fastapi import APIRouter, UploadFile

from app.config import settings
from app.services.audio_processing import standardize_audio, split_audio
from app.services.transcription import transcribe_audio
from app.services.measurement import Stopwatch
from app.services.error_handling import APIError, AIServiceTimeout, AudioProcessingError, TransientAIServiceError, AIServiceError, UnsupportedMediaFormat
from app.schemas import Transcript, ErrorReport

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=Transcript, responses={
    415: {"description": "Unsupported Media Type", "model": ErrorReport},
    500: {"description": "Internal Server Error", "model": ErrorReport},
    502: {"description": "AI Service Error", "model": ErrorReport},
    503: {"description": "AI Service Unavailable", "model": ErrorReport},
    504: {"description": "AI Service Timeout", "model": ErrorReport},
})
async def create_transcript(recording: UploadFile):
    # Check that the file is of a supported type.
    if recording.content_type not in [f"audio/{t}" for t in settings.SUPPORTED_AUDIO_TYPES]:
        error_message = f"{recording.content_type} is not a supported content type for this operation. Only audio files of the following type are supported: [{", ".join(settings.SUPPORTED_AUDIO_TYPES)}]."
        logger.error(error_message)
        raise UnsupportedMediaFormat(error_message).to_http()
    
    try:
        with Stopwatch() as audio_processing_timer:
            # If file is already mp3/mpeg, keep its format to reduce processing time,
            # for anything else convert to webm, which is also a smaller size vs. duration but tends to be better quality.
            target_format = recording.content_type.split("/")[1] if recording.content_type in ["audio/mpeg", "audio/mp3"] else "webm"

            # Convert the audio into a standard size/format.
            full_audio = standardize_audio(recording.file, format=target_format)

            # Ensure only files of <= 25 MB are used. Split if necessary into multiple files.
            # If the file is less than this size, the following will yield a list of one.
            MAX_FILE_SIZE = 25 * 1024 * 1024
            audio_segments = split_audio(full_audio, max_size=MAX_FILE_SIZE)

        logger.info(f"Audio converted in {audio_processing_timer.elapsed_ms / 1000:.2f}s")
        if len(audio_segments) > 1:
            logger.info(f"Audio split into {len(audio_segments)} segments due to size.")

        # Perform transcription using the AI Service.
        with Stopwatch() as transcription_timer:
            filename = f"{Path(recording.filename).stem}.{settings.AUDIO_FORMAT}"
            content_type = f"audio/{settings.AUDIO_FORMAT}"

            # Create the transcript for each segment.
            # Use the previous segment's transcript to prompt the next to improve accuracy on split audio.
            transcript_segments = []
            for i, file in enumerate(audio_segments):
                prompt = transcript_segments[i-1] if i > 1 else None
                transcript = await transcribe_audio(file, filename, content_type, prompt, timeout=settings.TRANSCRIPTION_TIMEOUT)
                transcript_segments.append(transcript)

            # Stitch the separate transcript pieces into the full transcript.
            full_transcript = " ".join(transcript_segments)

        logger.info(f"Transcript generated ({transcription_timer.elapsed_ms / 1000:.2f}s)")
    except (AudioProcessingError, AIServiceError, AIServiceTimeout, TransientAIServiceError) as e:
        logger.error(e)
        raise e.to_http()
    except Exception as e:
        logger.error(e)
        raise APIError(str(e)).to_http()
    finally:
        # Release temporary files created.
        full_audio.close()
        for file in (audio_segments or []):
            file.close()
    
    return Transcript(
        text=full_transcript,
        timeToProcessAudio=audio_processing_timer.elapsed_ms,
        timeToGenerate=transcription_timer.elapsed_ms,
        serviceUsed="OpenAI API",
        modelUsed="whisper-1"
    )
