import os
from pathlib import Path

from fastapi import APIRouter, UploadFile

from app.services.transcription import transcribe
from app.services.generative_ai import summarize_transcript
from app.services.audio_processing import split_audio
from app.services.measurement import ExecutionTimer, MB_to_bytes, bytes_to_MB
from app.services.error_handling import WebServiceError, BadRequest
from app.schemas import ErrorReport, GeneratedNote, NoteGenerationParameters, Transcript
from app.config import get_app_logger

logger = get_app_logger(__name__)

router = APIRouter()

BUILTIN_INSTRUCTIONS_FOLDER = ".prompts"

@router.post("/transcribe-audio", response_model=Transcript, responses={
    500: {"description": "Internal Server Error", "model": ErrorReport},
    502: {"description": "External Service Error", "model": ErrorReport},
    503: {"description": "External Service Unavailable", "model": ErrorReport},
    504: {"description": "External Service Timeout", "model": ErrorReport},
}, generate_unique_id_function=(lambda _: "TranscribeAudio_Parameters"))
async def transcribe_audio(audio: UploadFile):
    logger.info("Generating transcript")

    try:
        # Transcription cannot be performed on files > 25 MB.        
        if audio.size <= MB_to_bytes(25):
            # Process the file directly.
            with ExecutionTimer() as transcription_timer:
                transcript = await transcribe(audio.file, audio.filename, audio.content_type)
        else:
            logger.warning(f"File is {bytes_to_MB(audio.size):.2f} MB and must be split for transcribing.")

            with ExecutionTimer() as transcription_timer:
                partial_transcripts = []

                for (i, segment) in enumerate(split_audio(audio.file)):
                    logger.debug(f"Transcribing segment {i+1}")

                    (file, audio_format) = segment
                    content_type = f"audio/{audio_format}"
                    filename = f"{Path(audio.filename).stem}-{i:>03}.{audio_format}"
                    previous_partial_transcript = partial_transcripts[i-1] if i > 1 else None

                    partial_transcript = await transcribe(file, filename, content_type, prompt=previous_partial_transcript)                        
                    partial_transcripts.append(partial_transcript)

                transcript = " ".join(partial_transcripts)

        logger.info(f"Transcript generated in {transcription_timer.elapsed_ms / 1000:.2f}s")
    
        return Transcript(text=transcript)
    except WebServiceError as e:
        logger.error(e)
        raise e.as_http_exception()
    except Exception as e:
        logger.exception(e)
        raise WebServiceError(str(e)).as_http_exception()

@router.post("/generate-note", response_model=GeneratedNote, responses={
    400: {"description": "Bad Request", "model": ErrorReport},
    500: {"description": "Internal Server Error", "model": ErrorReport},
    502: {"description": "External Service Error", "model": ErrorReport},
    503: {"description": "External Service Unavailable", "model": ErrorReport},
    504: {"description": "External Service Timeout", "model": ErrorReport},
})
async def generate_note(parameters: NoteGenerationParameters):
    instructions_file = f"{parameters.noteType}.txt"
    instructions_path = os.path.join(BUILTIN_INSTRUCTIONS_FOLDER, instructions_file)

    logger.info(f"Generating summary: {parameters.noteType}")    
    
    if not os.path.exists(instructions_path):
        error = BadRequest(f"{parameters.noteType} is not a valid note type.")
        logger.error(error)
        raise error.as_http_exception()

    try:        
        with open(instructions_path, "r", errors="ignore") as f:
            instructions = f.read()

        with ExecutionTimer() as generation_timer:
            note = await summarize_transcript(parameters.transcript, instructions)

        logger.info(f"Summary generated in {generation_timer.elapsed_ms / 1000:.2f}s")
    except WebServiceError as e:
        logger.error(e)
        raise e.as_http_exception()
    except Exception as e:
        logger.exception(e)
        raise WebServiceError(str(e)).as_http_exception()

    return GeneratedNote(text=note, title=parameters.noteType)